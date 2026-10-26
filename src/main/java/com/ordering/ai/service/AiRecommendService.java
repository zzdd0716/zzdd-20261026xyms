package com.ordering.ai.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.ordering.ai.config.AiProperties;
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

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * AI 菜品推荐服务
 * 流程：查上架菜品 → 拼 Prompt → 调豆包 API → 解析返回的菜品名 → 匹配回菜品列表
 */
@Service
@RequiredArgsConstructor
public class AiRecommendService {

    private final AiProperties aiProperties;
    private final DishMapper dishMapper;
    private final CategoryMapper categoryMapper;
    private final AiConfigService aiConfigService;

    /**
     * 根据顾客口味偏好推荐菜品
     *
     * @param shopId        门店ID
     * @param preference    顾客口味偏好，如"我想吃清淡的""不要辣"
     * @param excludeIds    要排除的菜品ID（换一批时，避开已经推荐过的）
     * @return 推荐的菜品列表（最多3道）
     */
    public List<Dish> recommendDishes(Long shopId, String preference, List<Long> excludeIds) {
        if (!aiProperties.isEnabled()) {
            throw new RuntimeException("AI功能未开启");
        }
        if (!aiConfigService.isEnabled(shopId, "ai_recommend_enabled")) {
            throw new RuntimeException("AI菜品推荐已关闭");
        }

        // 1. 查门店上架菜品
        List<Dish> allDishes = dishMapper.selectList(
                new LambdaQueryWrapper<Dish>()
                        .eq(Dish::getShopId, shopId)
                        .eq(Dish::getStatus, 1)
        );
        if (allDishes.isEmpty()) {
            return new ArrayList<>();
        }

        // 2. 按配置的分类过滤：只从指定分类里推荐
        List<Dish> dishes = filterByCategories(shopId, allDishes);

        // 3. 排除已经推荐过的菜，换一批时出新结果
        Set<Long> excludeSet = excludeIds == null ? Set.of() : new HashSet<>(excludeIds);
        List<Dish> available = dishes.stream()
                .filter(d -> !excludeSet.contains(d.getId()))
                .toList();
        if (available.isEmpty()) {
            available = dishes; // 全推荐完了就重新开始
        }

        // 4. 拼 Prompt：把菜单列出来，让 AI 从里面选
        StringBuilder menuDesc = new StringBuilder();
        for (int i = 0; i < available.size(); i++) {
            Dish d = available.get(i);
            menuDesc.append(i + 1).append(". ").append(d.getName())
                    .append("（¥").append(d.getPrice()).append("）");
            if (d.getDescription() != null && !d.getDescription().isBlank()) {
                menuDesc.append("：").append(d.getDescription());
            }
            menuDesc.append("\n");
        }

        String userPreference = (preference == null || preference.isBlank())
                ? "随便推荐几道招牌菜" : preference;

        String prompt = "你是烧腊店点餐助手。以下是本店菜单：\n"
                + menuDesc
                + "\n顾客说：" + userPreference
                + "\n请从上面的菜单中推荐3道菜，选和之前不一样的，只返回菜品名称，每行一个，不要解释，不要编号。";

        // 5. 调豆包 API
        String aiReply = callChatApi(prompt);

        // 6. 解析 AI 返回的菜品名，匹配回数据库里的菜品
        List<Dish> result = new ArrayList<>();
        for (String line : aiReply.split("\n")) {
            String name = line.replaceAll("^\\d+[.、）)]\\s*", "").trim();
            if (name.isBlank()) continue;
            for (Dish d : available) {
                if (d.getName().contains(name) || name.contains(d.getName())) {
                    if (!result.contains(d)) {
                        result.add(d);
                    }
                    break;
                }
            }
        }

        // 兜底：没匹配到就返回前3道
        if (result.isEmpty() && available.size() >= 3) {
            result = new ArrayList<>(available.subList(0, 3));
        }

        return result;
    }

    /**
     * 按配置的分类名称过滤菜品
     */
    private List<Dish> filterByCategories(Long shopId, List<Dish> allDishes) {
        String config = aiProperties.getRecommendCategories();
        if (config == null || config.isBlank()) {
            return allDishes; // 没配置就全菜单
        }

        // 查出门店所有分类
        List<Category> categories = categoryMapper.selectList(
                new LambdaQueryWrapper<Category>()
                        .eq(Category::getShopId, shopId)
                        .eq(Category::getStatus, 1)
        );

        // 找出配置里指定的分类名称对应的分类ID
        Set<String> targetNames = Arrays.stream(config.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toSet());

        Set<Long> targetCategoryIds = categories.stream()
                .filter(c -> targetNames.stream().anyMatch(name -> c.getName().contains(name)))
                .map(Category::getId)
                .collect(Collectors.toSet());

        if (targetCategoryIds.isEmpty()) {
            return allDishes; // 没匹配到分类就全菜单
        }

        // 只保留目标分类下的菜品
        return allDishes.stream()
                .filter(d -> targetCategoryIds.contains(d.getCategoryId()))
                .toList();
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
        body.put("temperature", 0.9);

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
