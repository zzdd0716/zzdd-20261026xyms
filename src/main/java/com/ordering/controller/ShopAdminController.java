package com.ordering.controller;

import com.ordering.common.result.Result;
import com.ordering.entity.Category;
import com.ordering.entity.Dish;
import com.ordering.entity.DiningTable;
import com.ordering.service.ShopAdminService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 商家管理后台接口：菜品、分类、桌台码
 */
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@Tag(name = "商家管理", description = "商家后台：分类/菜品/桌台码的增删查")
public class ShopAdminController {

    private final ShopAdminService shopAdminService;

    // ===== 分类管理 =====
    @GetMapping("/categories")
    @Operation(summary = "分类列表", description = "按门店ID查询全部分类（含停用）")
    public Result<List<Category>> categories(
            @Parameter(description = "门店ID", required = true, example = "1")
            @RequestParam Long shopId) {
        return Result.success(shopAdminService.listCategories(shopId));
    }

    @PostMapping("/category")
    @Operation(summary = "新增/修改分类", description = "带 id 为修改，不带 id 为新增；字段：name(必填)、sortOrder、status")
    public Result<Category> saveCategory(@RequestBody Category category) {
        return Result.success(shopAdminService.saveCategory(category));
    }

    @DeleteMapping("/category/{id}")
    @Operation(summary = "删除分类", description = "按ID删除分类")
    public Result<Void> deleteCategory(
            @Parameter(description = "分类ID", required = true, example = "1")
            @PathVariable Long id) {
        shopAdminService.deleteCategory(id);
        return Result.success();
    }

    // ===== 菜品管理 =====
    @GetMapping("/dishes")
    @Operation(summary = "菜品列表", description = "按门店ID查询全部菜品（含下架）")
    public Result<List<Dish>> dishes(
            @Parameter(description = "门店ID", required = true, example = "1")
            @RequestParam Long shopId) {
        return Result.success(shopAdminService.listDishes(shopId));
    }

    @PostMapping("/dish")
    @Operation(summary = "新增/修改菜品", description = "带 id 为修改，不带 id 为新增；字段：name(必填)、price(必填)、categoryId、stock、isRecommend、status")
    public Result<Dish> saveDish(@RequestBody Dish dish) {
        return Result.success(shopAdminService.saveDish(dish));
    }

    @DeleteMapping("/dish/{id}")
    @Operation(summary = "删除菜品", description = "按ID删除菜品")
    public Result<Void> deleteDish(
            @Parameter(description = "菜品ID", required = true, example = "1")
            @PathVariable Long id) {
        shopAdminService.deleteDish(id);
        return Result.success();
    }

    // ===== 桌台码管理 =====
    @GetMapping("/tables")
    @Operation(summary = "桌台列表", description = "按门店ID查询桌台列表")
    public Result<List<DiningTable>> tables(
            @Parameter(description = "门店ID", required = true, example = "1")
            @RequestParam Long shopId) {
        return Result.success(shopAdminService.listTables(shopId));
    }

    @PostMapping("/table")
    @Operation(summary = "新增/修改桌台", description = "带 id 为修改，不带 id 为新增；字段：tableNo(必填)、seatCount、status；qrCode 为空时自动生成")
    public Result<DiningTable> saveTable(@RequestBody DiningTable table) {
        return Result.success(shopAdminService.saveTable(table));
    }

    @DeleteMapping("/table/{id}")
    @Operation(summary = "删除桌台", description = "按ID删除桌台")
    public Result<Void> deleteTable(
            @Parameter(description = "桌台ID", required = true, example = "1")
            @PathVariable Long id) {
        shopAdminService.deleteTable(id);
        return Result.success();
    }
}
