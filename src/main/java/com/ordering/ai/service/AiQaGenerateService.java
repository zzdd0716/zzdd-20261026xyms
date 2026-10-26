package com.ordering.ai.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ordering.ai.entity.AiQa;
import com.ordering.ai.mapper.AiQaMapper;
import com.ordering.entity.Category;
import com.ordering.entity.Dish;
import com.ordering.mapper.CategoryMapper;
import com.ordering.mapper.DishMapper;
import com.ordering.ai.config.AiProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.stream.Collectors;

/**
 * AI 自动生成 FAQ
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AiQaGenerateService {

    private final AiProperties aiProperties;
    private final DishMapper dishMapper;
    private final CategoryMapper categoryMapper;
    private final AiQaMapper aiQaMapper;
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * 根据菜品菜单自动生成FAQ，自动去重
     */
    public int generateFaq(Long shopId) {
        // 1. 查所有菜品和分类
        List<Dish> dishes = dishMapper.selectList(
                new LambdaQueryWrapper<Dish>().eq(Dish::getShopId, shopId).eq(Dish::getStatus, 1)
        );
        List<Category> categories = categoryMapper.selectList(
                new LambdaQueryWrapper<Category>().eq(Category::getShopId, shopId)
        );

        // 2. 查已有的所有问题，用来去重
        List<AiQa> existingList = aiQaMapper.selectList(
                new LambdaQueryWrapper<AiQa>().eq(AiQa::getShopId, shopId)
        );
        List<String> existingQuestions = existingList.stream()
                .map(AiQa::getQuestion)
                .collect(Collectors.toList());

        // 3. 拼菜单信息
        StringBuilder menuInfo = new StringBuilder();
        menuInfo.append("菜品分类：");
        for (Category c : categories) {
            menuInfo.append(c.getName()).append("、");
        }
        menuInfo.append("\n\n菜品列表：\n");
        for (Dish d : dishes) {
            menuInfo.append("- ").append(d.getName())
                    .append("，价格：").append(d.getPrice()).append("元");
            if (d.getDescription() != null) {
                menuInfo.append("，简介：").append(d.getDescription());
            }
            menuInfo.append("\n");
        }

        // 4. 拼已有问题列表
        StringBuilder existingInfo = new StringBuilder();
        if (existingQuestions.size() > 0) {
            existingInfo.append("以下是已经有的问题，不要再生成重复或意思相近的：\n");
            for (String q : existingQuestions) {
                existingInfo.append("- ").append(q).append("\n");
            }
        }

        // 5. 拼Prompt
        String prompt = "你是餐饮店的智能客服。请根据菜品菜单，生成顾客常见问题和标准答案。\n\n"
                + menuInfo.toString()
                + "\n" + existingInfo.toString()
                + "\n\n要求：\n"
                + "1. 生成新的、和上面已有问题不重复、意思也不相近的问题\n"
                + "2. 问题要像顾客真实会问的话，答案要简短准确\n"
                + "3. 涵盖：价格、口味、辣度、打包、外卖、推荐菜、菜品成分、分量、忌口等方面\n"
                + "4. 如果能想到的新问题已经不多了，就少生成几条，不要硬凑\n"
                + "5. 严格返回JSON数组格式，不要其他文字不要markdown\n"
                + "格式：[{\"question\":\"问题1\",\"answer\":\"答案1\"},{\"question\":\"问题2\",\"answer\":\"答案2\"}]";

        try {
            // 6. 调豆包API
            RestTemplate restTemplate = new RestTemplate();
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(aiProperties.getApiKey());

            String requestBody = "{"
                    + "\"model\": \"" + aiProperties.getModel() + "\","
                    + "\"messages\": [{\"role\": \"user\", \"content\": \"" + escapeJson(prompt) + "\"}],"
                    + "\"temperature\": 0.8"
                    + "}";

            ResponseEntity<String> resp = restTemplate.exchange(
                    aiProperties.getApiUrl(),
                    HttpMethod.POST,
                    new HttpEntity<>(requestBody, headers),
                    String.class
            );

            // 7. 解析AI返回
            JsonNode root = objectMapper.readTree(resp.getBody());
            String content = root.path("choices").get(0).path("message").path("content").asText();

            content = content.trim();
            if (content.startsWith("```")) {
                int start = content.indexOf('[');
                int end = content.lastIndexOf(']');
                if (start >= 0 && end > start) {
                    content = content.substring(start, end + 1);
                } else {
                    // AI返回的不是数组，说明问题饱和了
                    throw new RuntimeException("问题基本饱和，可手动输入");
                }
            }

            JsonNode faqList = objectMapper.readTree(content);
            if (faqList.size() == 0) {
                throw new RuntimeException("问题基本饱和，可手动输入");
            }

            // 8. 二次去重：插入前再对比一次数据库
            int count = 0;
            for (JsonNode item : faqList) {
                String question = item.path("question").asText();
                // 检查是否已存在
                long existCount = aiQaMapper.selectCount(
                        new LambdaQueryWrapper<AiQa>()
                                .eq(AiQa::getShopId, shopId)
                                .eq(AiQa::getQuestion, question)
                );
                if (existCount > 0) {
                    continue; // 跳过重复的
                }
                AiQa qa = new AiQa();
                qa.setShopId(shopId);
                qa.setQuestion(question);
                qa.setAnswer(item.path("answer").asText());
                qa.setStatus(1);
                aiQaMapper.insert(qa);
                count++;
            }

            log.info("AI自动生成FAQ {} 条（去重后）", count);

            if (count == 0) {
                throw new RuntimeException("问题基本饱和，可手动输入");
            }

            return count;

        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            log.error("AI生成FAQ失败", e);
            throw new RuntimeException("AI生成失败：" + e.getMessage());
        }
    }

    /** 转义JSON特殊字符 */
    private String escapeJson(String s) {
        return s.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");
    }
}
