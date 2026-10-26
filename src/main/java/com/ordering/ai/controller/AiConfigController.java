package com.ordering.ai.controller;

import com.ordering.ai.service.AiConfigService;
import com.ordering.common.result.Result;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * AI 功能开关配置（管理员用）
 */
@RestController
@RequestMapping("/api/admin/ai-config")
@RequiredArgsConstructor
@Tag(name = "AI管理", description = "管理员开关AI功能")
public class AiConfigController {

    private final AiConfigService aiConfigService;

    /** 查门店所有AI开关 */
    @GetMapping
    @Operation(summary = "查AI开关配置", description = "查门店所有AI功能的开关状态")
    public Result<Map<String, Boolean>> list(@RequestParam Long shopId) {
        return Result.success(aiConfigService.listConfig(shopId));
    }

    /** 修改某个开关 */
    @PutMapping
    @Operation(summary = "修改AI开关", description = "修改某个AI功能的开关状态")
    public Result<Void> update(@RequestBody Map<String, Object> body) {
        Long shopId = Long.valueOf(body.get("shopId").toString());
        String key = body.get("key").toString();
        boolean value = Boolean.parseBoolean(body.get("value").toString());
        aiConfigService.updateConfig(shopId, key, value);
        return Result.success();
    }
}
