package com.ordering.ai.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ordering.ai.config.AiProperties;
import com.ordering.ai.entity.AiQa;
import com.ordering.ai.mapper.AiQaMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.List;

/**
 * AI 智能去重：找出语义相似的FAQ
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AiQaDedupService {

    private final AiProperties aiProperties;
    private final AiQaMapper aiQaMapper;
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * 智能去重：找出语义重复的问题并删除
     * @return 删除了多少条
     */
    public int deduplicate(Long shopId) {
        // 1. 查所有问题
        List<AiQa> list = aiQaMapper.selectList(
                new LambdaQueryWrapper<AiQa>().eq(AiQa::getShopId, shopId)
        );

        if (list.size() <= 1) {
            return 0;
        }

        // 2. 拼成问题列表
        StringBuilder questions = new StringBuilder();
        for (int i = 0; i < list.size(); i++) {
            AiQa qa = list.get(i);
            questions.append(i).append(". ").append(qa.getQuestion()).append("\n");
        }

        // 3. 拼Prompt，让AI找出重复的
        String prompt = "下面是餐饮店里顾客常见问题的列表，编号从0开始。\n"
                + "请找出哪些问题是意思相同或语义非常相近的，每一组只保留最早出现的那一个（编号最小的），其他的都标记为需要删除。\n\n"
                + questions.toString()
                + "\n\n要求：\n"
                + "1. 只找出意思完全一样或几乎一样的，比如\"多少钱\"和\"价格是多少\"这种算重复\n"
                + "2. 只是问的角度不同但答案完全不同的，不要删\n"
                + "3. 严格返回JSON数组，里面是要删除的编号列表\n"
                + "格式：[1, 3, 5, 8]";

        try {
            // 4. 调豆包API
            RestTemplate restTemplate = new RestTemplate();
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(aiProperties.getApiKey());

            String requestBody = "{"
                    + "\"model\": \"" + aiProperties.getModel() + "\","
                    + "\"messages\": [{\"role\": \"user\", \"content\": \"" + escapeJson(prompt) + "\"}],"
                    + "\"temperature\": 0.3"
                    + "}";

            ResponseEntity<String> resp = restTemplate.exchange(
                    aiProperties.getApiUrl(),
                    HttpMethod.POST,
                    new HttpEntity<>(requestBody, headers),
                    String.class
            );

            // 5. 解析AI返回
            JsonNode root = objectMapper.readTree(resp.getBody());
            String content = root.path("choices").get(0).path("message").path("content").asText();
            content = content.trim();

            // 提取数组
            int start = content.indexOf('[');
            int end = content.lastIndexOf(']');
            if (start < 0 || end <= start) {
                log.info("AI去重：没有找到要删除的");
                return 0;
            }
            content = content.substring(start, end + 1);

            JsonNode toDeleteIndexes = objectMapper.readTree(content);
            if (toDeleteIndexes.size() == 0) {
                return 0;
            }

            // 6. 收集要删除的ID
            List<Long> idsToDelete = new ArrayList<>();
            for (JsonNode idxNode : toDeleteIndexes) {
                int idx = idxNode.asInt();
                if (idx >= 0 && idx < list.size()) {
                    idsToDelete.add(list.get(idx).getId());
                }
            }

            // 7. 批量删除
            for (Long id : idsToDelete) {
                aiQaMapper.deleteById(id);
            }

            log.info("AI智能去重，删除了{}条重复问题", idsToDelete.size());
            return idsToDelete.size();

        } catch (Exception e) {
            log.error("AI去重失败", e);
            throw new RuntimeException("去重失败：" + e.getMessage());
        }
    }

    private String escapeJson(String s) {
        return s.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");
    }
}
