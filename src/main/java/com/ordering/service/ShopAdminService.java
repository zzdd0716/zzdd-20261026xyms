package com.ordering.service;

import com.ordering.entity.Category;
import com.ordering.entity.Dish;
import com.ordering.entity.DiningTable;

import java.util.List;

/**
 * 商家管理服务：菜品、分类、桌台码管理
 */
public interface ShopAdminService {

    // ===== 菜品分类 =====
    List<Category> listCategories(Long shopId);

    Category saveCategory(Category category);

    void deleteCategory(Long id);

    // ===== 菜品 =====
    List<Dish> listDishes(Long shopId);

    Dish saveDish(Dish dish);

    void deleteDish(Long id);

    // ===== 桌台码 =====
    List<DiningTable> listTables(Long shopId);

    DiningTable saveTable(DiningTable table);

    void deleteTable(Long id);
}
