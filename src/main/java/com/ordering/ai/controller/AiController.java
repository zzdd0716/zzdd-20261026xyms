package com.ordering.ai.controller;

import com.ordering.ai.service.AiRecommendService;
import com.ordering.common.result.Result;
import com.ordering.entity.Dish;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * AI 功能接口
 */
@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
@Tag(name = "AI功能", description = "AI菜品推荐、智能客服等")
public class AiController {

    private final AiRecommendService aiRecommendService;

    /**
     * AI 菜品推荐
     * 请求体：{ "shopId": 1, "preference": "我想吃清淡的", "excludeIds": [1, 2] }
     */
    @PostMapping("/recommend")
    @Operation(summary = "AI菜品推荐", description = "顾客输入口味偏好，AI从菜单中推荐最多3道菜；excludeIds为要排除的菜品ID（换一批时用）")
    public Result<List<Dish>> recommend(@RequestBody Map<String, Object> body) {
        Long shopId = Long.valueOf(body.get("shopId").toString());
        String preference = body.get("preference") == null ? "" : body.get("preference").toString();
        @SuppressWarnings("unchecked")
        List<Long> excludeIds = body.get("excludeIds") == null
                ? List.of()
                : ((List<?>) body.get("excludeIds")).stream().map(x -> Long.valueOf(x.toString())).toList();
        return Result.success(aiRecommendService.recommendDishes(shopId, preference, excludeIds));
    }
}
