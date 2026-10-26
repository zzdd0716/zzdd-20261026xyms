package com.ordering.ai.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.ordering.ai.config.AiProperties;
import com.ordering.ai.entity.AiQa;
import com.ordering.ai.mapper.AiQaMapper;
import com.ordering.entity.Category;
import com.ordering.entity.Dish;
import com.ordering.mapper.CategoryMapper;
import com.ordering.mapper.DishMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * AI 智能客服服务
 * 流程：查FAQ + 查菜品菜单 → 一起拼进Prompt → 调豆包API → AI结合知识库+菜单回答 → 返回
 */
@Service
@RequiredArgsConstructor
public class AiChatService {

    private final AiProperties aiProperties;
    private final AiQaMapper aiQaMapper;
    private final AiConfigService aiConfigService;
    private final DishMapper dishMapper;
    private final CategoryMapper categoryMapper;

    /**
     * 智能客服对话
     *
     * @param shopId 门店ID
     * @param userMessage 顾客问题
     * @return AI回答
     */
    public String chat(Long shopId, String userMessage) {
        if (!aiProperties.isEnabled()) {
            throw new RuntimeException("AI功能未开启");
        }
        if (!aiConfigService.isEnabled(shopId, "ai_chat_enabled")) {
            throw new RuntimeException("智能客服已关闭");
        }

        // 1. 查门店启用的FAQ知识库
        List<AiQa> qaList = aiQaMapper.selectList(
                new LambdaQueryWrapper<AiQa>()
                        .eq(AiQa::getShopId, shopId)
                        .eq(AiQa::getStatus, 1)
        );

        // 2. 查菜品菜单信息
        List<Dish> dishes = dishMapper.selectList(
                new LambdaQueryWrapper<Dish>()
                        .eq(Dish::getShopId, shopId)
                        .eq(Dish::getStatus, 1)
        );
        List<Category> categories = categoryMapper.selectList(
                new LambdaQueryWrapper<Category>()
                        .eq(Category::getShopId, shopId)
        );

        // 3. 拼FAQ知识库
        StringBuilder knowledge = new StringBuilder();
        for (AiQa qa : qaList) {
            knowledge.append("Q：").append(qa.getQuestion()).append("\n");
            knowledge.append("A：").append(qa.getAnswer()).append("\n");
        }

        // 4. 拼菜品菜单信息
        StringBuilder menu = new StringBuilder();
        menu.append("菜品分类：");
        for (Category c : categories) {
            menu.append(c.getName()).append("、");
        }
        menu.append("\n菜品列表：\n");
        for (Dish d : dishes) {
            menu.append("- ").append(d.getName()).append("，").append(d.getPrice()).append("元");
            if (d.getDescription() != null) {
                menu.append("（").append(d.getDescription()).append("）");
            }
            menu.append("\n");
        }

        // 5. 拼完整Prompt
        String prompt = "你是这家餐饮店的智能客服，热情友好地回答顾客问题。\n\n"
                + "【菜品菜单信息】\n"
                + menu
                + "\n【常见问题知识库】\n"
                + knowledge
                + "\n顾客问：" + userMessage
                + "\n\n要求：\n"
                + "1. 优先根据上面的菜品菜单和知识库回答顾客问题\n"
                + "2. 如果实在答不上来，就礼貌地说\"这个问题我帮你转人工客服，请稍后再试\"\n"
                + "3. 回答要简短友好，不超过80字";

        // 6. 调豆包 API
        return callChatApi(prompt);
    }

    /**
     * 调豆包对话接口
     */
    @SuppressWarnings("unchecked")
    private String callChatApi(String prompt) {
        RestTemplate restTemplate = new RestTemplate();

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(aiProperties.getApiKey());

        Map<String, Object> body = new HashMap<>();
        body.put("model", aiProperties.getModel());
        body.put("messages", List.of(
                Map.of("role", "user", "content", prompt)
        ));
        body.put("temperature", 0.7);

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

        Map<String, Object> response = restTemplate.postForObject(
                aiProperties.getApiUrl(), request, Map.class);

        if (response == null || response.get("choices") == null) {
            throw new RuntimeException("AI接口调用失败：" + response);
        }

        List<Map<String, Object>> choices = (List<Map<String, Object>>) response.get("choices");
        Map<String, Object> firstChoice = choices.get(0);
        Map<String, Object> message = (Map<String, Object>) firstChoice.get("message");
        return (String) message.get("content");
    }
}
