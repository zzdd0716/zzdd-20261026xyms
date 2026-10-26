package com.ordering.ai.controller;

import com.ordering.ai.service.AiChatService;
import com.ordering.common.result.Result;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * AI 智能客服接口
 */
@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
@Tag(name = "AI功能", description = "AI菜品推荐、智能客服等")
public class AiChatController {

    private final AiChatService aiChatService;

    /**
     * 智能客服对话
     * 请求体：{ "shopId": 1, "message": "你们几点开门？" }
     */
    @PostMapping("/chat")
    @Operation(summary = "智能客服对话", description = "顾客提问，AI根据门店FAQ知识库自动回答")
    public Result<String> chat(@RequestBody Map<String, Object> body) {
        Long shopId = Long.valueOf(body.get("shopId").toString());
        String message = body.get("message") == null ? "" : body.get("message").toString();
        return Result.success(aiChatService.chat(shopId, message));
    }
}
