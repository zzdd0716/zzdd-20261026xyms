package com.ordering.controller;

import com.ordering.common.result.Result;
import com.ordering.entity.Category;
import com.ordering.entity.Dish;
import com.ordering.service.MenuService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 顾客扫码点餐 - 菜单接口
 */
@RestController
@RequestMapping("/api/menu")
@RequiredArgsConstructor
@Tag(name = "顾客点餐-菜单", description = "顾客扫码进入门店后的菜单分类与菜品查询")
public class MenuController {

    private final MenuService menuService;

    /** 查询门店分类列表 */
    @GetMapping("/categories")
    @Operation(summary = "查询菜单分类", description = "按门店ID查询启用的菜品分类，按排序值升序返回")
    public Result<List<Category>> categories(
            @Parameter(description = "门店ID", required = true, example = "1")
            @RequestParam Long shopId) {
        return Result.success(menuService.listCategories(shopId));
    }

    /** 查询菜品列表（可按分类筛选） */
    @GetMapping("/dishes")
    @Operation(summary = "查询菜品列表", description = "按门店ID查询上架菜品，可按分类ID筛选；推荐菜排前")
    public Result<List<Dish>> dishes(
            @Parameter(description = "门店ID", required = true, example = "1")
            @RequestParam Long shopId,
            @Parameter(description = "分类ID（可空，为空查全部）", example = "1")
            @RequestParam(required = false) Long categoryId) {
        return Result.success(menuService.listDishes(shopId, categoryId));
    }
}
