package com.ordering.ai.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.ordering.ai.entity.AiQa;
import com.ordering.ai.mapper.AiQaMapper;
import com.ordering.ai.service.AiQaDedupService;
import com.ordering.ai.service.AiQaGenerateService;
import com.ordering.common.result.Result;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * FAQ 知识库管理（管理员用）
 */
@RestController
@RequestMapping("/api/admin/ai-qa")
@RequiredArgsConstructor
@Tag(name = "AI管理", description = "FAQ知识库增删改查")
public class AiQaAdminController {

    private final AiQaMapper aiQaMapper;
    private final AiQaGenerateService aiQaGenerateService;
    private final AiQaDedupService aiQaDedupService;

    /** 查门店所有FAQ列表 */
    @GetMapping
    @Operation(summary = "查FAQ列表", description = "查门店所有知识库问题")
    public Result<List<AiQa>> list(@RequestParam Long shopId) {
        List<AiQa> list = aiQaMapper.selectList(
                new LambdaQueryWrapper<AiQa>()
                        .eq(AiQa::getShopId, shopId)
                        .orderByDesc(AiQa::getId)
        );
        return Result.success(list);
    }

    /** 新增FAQ */
    @PostMapping
    @Operation(summary = "新增FAQ", description = "添加一条新的常见问题")
    public Result<Void> add(@RequestBody AiQa qa) {
        aiQaMapper.insert(qa);
        return Result.success();
    }

    /** 修改FAQ */
    @PutMapping
    @Operation(summary = "修改FAQ", description = "修改问题或答案")
    public Result<Void> update(@RequestBody AiQa qa) {
        aiQaMapper.updateById(qa);
        return Result.success();
    }

    /** 删除FAQ */
    @DeleteMapping("/{id}")
    @Operation(summary = "删除FAQ", description = "删除一条常见问题")
    public Result<Void> delete(@PathVariable Long id) {
        aiQaMapper.deleteById(id);
        return Result.success();
    }

    /** AI自动生成50条FAQ */
    @PostMapping("/generate")
    @Operation(summary = "AI自动生成FAQ", description = "根据菜品菜单自动生成常见问答，自动去重")
    public Result<Integer> generate(@RequestParam Long shopId) {
        int count = aiQaGenerateService.generateFaq(shopId);
        return Result.success(count);
    }

    /** AI智能去重：找出语义相似的问题并删除 */
    @PostMapping("/deduplicate")
    @Operation(summary = "AI智能去重", description = "AI自动找出意思重复的问题并删除")
    public Result<Integer> deduplicate(@RequestParam Long shopId) {
        int count = aiQaDedupService.deduplicate(shopId);
        return Result.success(count);
    }
}
