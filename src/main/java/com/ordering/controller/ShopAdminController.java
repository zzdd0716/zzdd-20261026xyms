package com.ordering.controller;

import com.ordering.common.result.Result;
import com.ordering.entity.Category;
import com.ordering.entity.Dish;
import com.ordering.entity.DiningTable;
import com.ordering.service.ShopAdminService;
import com.ordering.service.WechatService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
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
    private final WechatService wechatService;

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
    @Operation(summary = "新增/修改菜品", description = "带 id 为修改，不带 id 为新增；字段：name(必填)、price(必填)、categoryId、stock、status")
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

    @GetMapping("/table/qrcode")
    @Operation(summary = "桌台小程序码", description = "生成指定桌台的微信小程序码，扫码直接进入该桌台点餐页")
    public void tableQrcode(
            @Parameter(description = "桌台ID", required = true, example = "1")
            @RequestParam Long tableId,
            HttpServletResponse response) throws IOException {
        byte[] image = wechatService.getWxacode(String.valueOf(tableId), "pages/index/index");
        response.setContentType("image/jpeg");
        response.setHeader("Content-Disposition", "inline; filename=table_" + tableId + ".jpg");
        response.getOutputStream().write(image);
        response.getOutputStream().flush();
    }

    // ===== 自提码 =====
    // 自提码缓存（key=env, value=图片字节）—— 同一版本码完全相同，避免每次调用微信接口（3-8秒）
    private static final java.util.Map<String, byte[]> pickupQrCache = new java.util.concurrent.ConcurrentHashMap<>();

    @GetMapping("/pickup/qrcode")
    @Operation(summary = "自提码小程序码", description = "生成自提码微信小程序码，扫码进入自提模式（菜品默认打包、不可更改）；env 可选 release正式/trial体验/develop开发")
    public void pickupQrcode(
            @Parameter(description = "小程序版本：release 正式 / trial 体验 / develop 开发（默认 release）", example = "release")
            @RequestParam(defaultValue = "release") String env,
            HttpServletResponse response) throws IOException {
        byte[] image = pickupQrCache.computeIfAbsent(env, k ->
                wechatService.getWxacodeUnlimit("type=pickup", "pages/index/index", k));
        response.setContentType("image/jpeg");
        response.setHeader("Content-Disposition", "inline; filename=pickup_qrcode.jpg");
        response.getOutputStream().write(image);
        response.getOutputStream().flush();
    }

    // ===== 规格选项管理 =====
    @PostMapping("/spec-options/status")
    @Operation(summary = "批量更新规格选项状态", description = "单独启用/停用规格选项，不影响菜品本身状态")
    public Result<Void> updateSpecOptionsStatus(@RequestBody java.util.Map<String, Object> body) {
        @SuppressWarnings("unchecked")
        java.util.List<Long> ids = ((java.util.List<?>) body.get("ids")).stream()
                .map(x -> Long.valueOf(x.toString())).collect(java.util.stream.Collectors.toList());
        Integer status = Integer.valueOf(body.get("status").toString());
        shopAdminService.updateSpecOptionsStatus(ids, status);
        return Result.success();
    }
}
