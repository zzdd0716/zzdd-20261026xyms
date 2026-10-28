package com.ordering.ai.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.ordering.ai.entity.AiQa;
import com.ordering.ai.mapper.AiQaMapper;
import com.ordering.ai.service.AiQaDedupService;
import com.ordering.ai.service.AiQaGenerateService;
import com.ordering.ai.service.EmbeddingService;
import com.ordering.common.result.Result;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * FAQ 知识库管理（管理员用）
 * 新增/修改FAQ时自动生成向量，支持RAG语义检索
 */
@Slf4j
@RestController
@RequestMapping("/api/admin/ai-qa")
@RequiredArgsConstructor
@Tag(name = "AI管理", description = "FAQ知识库增删改查 + 向量索引")
public class AiQaAdminController {

    private final AiQaMapper aiQaMapper;
    private final AiQaGenerateService aiQaGenerateService;
    private final AiQaDedupService aiQaDedupService;
    private final EmbeddingService embeddingService;

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

    /** 新增FAQ（自动生成问题向量） */
    @PostMapping
    @Operation(summary = "新增FAQ", description = "添加一条新的常见问题，自动生成向量索引")
    public Result<Void> add(@RequestBody AiQa qa) {
        aiQaMapper.insert(qa);
        // 新增后自动生成问题向量
        try {
            float[] vec = embeddingService.embed(qa.getQuestion());
            qa.setQuestionVector(EmbeddingService.vectorToJson(vec));
            qa.setVectorStatus(1);
            aiQaMapper.updateById(qa);
        } catch (Exception e) {
            log.warn("FAQ新增后向量生成失败，ID={}: {}", qa.getId(), e.getMessage());
            // 不阻断主流程，向量失败FAQ照样能用，只是检索不准
        }
        return Result.success();
    }

    /** 修改FAQ（问题变了就重新生成向量） */
    @PutMapping
    @Operation(summary = "修改FAQ", description = "修改问题或答案，问题变更时自动重新生成向量")
    public Result<Void> update(@RequestBody AiQa qa) {
        aiQaMapper.updateById(qa);
        // 如果改了问题，重新生成向量
        if (qa.getQuestion() != null) {
            try {
                float[] vec = embeddingService.embed(qa.getQuestion());
                qa.setQuestionVector(EmbeddingService.vectorToJson(vec));
                qa.setVectorStatus(1);
                aiQaMapper.updateById(qa);
            } catch (Exception e) {
                log.warn("FAQ修改后向量更新失败，ID={}: {}", qa.getId(), e.getMessage());
            }
        }
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
        // 生成后批量补向量
        refreshVectors(shopId);
        return Result.success(count);
    }

    /** AI智能去重：找出语义相似的问题并删除 */
    @PostMapping("/deduplicate")
    @Operation(summary = "AI智能去重", description = "AI自动找出意思重复的问题并删除")
    public Result<Integer> deduplicate(@RequestParam Long shopId) {
        int count = aiQaDedupService.deduplicate(shopId);
        return Result.success(count);
    }

    /**
     * 批量刷新向量索引（给旧数据补向量）
     * 首次升级RAG后调用一次，把所有历史FAQ都补上向量
     */
    @PostMapping("/refresh-vectors")
    @Operation(summary = "批量刷新向量索引", description = "给所有未向量化的FAQ批量生成向量，首次升级RAG后调用一次")
    public Result<Integer> refreshVectors(@RequestParam Long shopId) {
        List<AiQa> needVector = aiQaMapper.selectList(
                new LambdaQueryWrapper<AiQa>()
                        .eq(AiQa::getShopId, shopId)
                        .and(w -> w.isNull(AiQa::getVectorStatus).or().eq(AiQa::getVectorStatus, 0))
        );

        int successCount = 0;
        for (AiQa qa : needVector) {
            try {
                float[] vec = embeddingService.embed(qa.getQuestion());
                qa.setQuestionVector(EmbeddingService.vectorToJson(vec));
                qa.setVectorStatus(1);
                aiQaMapper.updateById(qa);
                successCount++;
            } catch (Exception e) {
                log.warn("向量生成失败，FAQ ID={}: {}", qa.getId(), e.getMessage());
            }
        }
        log.info("门店{}向量刷新完成，成功{}/{}条", shopId, successCount, needVector.size());
        return Result.success(successCount);
    }
}
