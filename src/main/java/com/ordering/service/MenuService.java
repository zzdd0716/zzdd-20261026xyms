package com.ordering.service;

import com.ordering.entity.Category;
import com.ordering.entity.Dish;

import java.util.List;

/**
 * 菜单服务：顾客扫码看到的菜品与分类
 */
public interface MenuService {

    /**
     * 按门店查询分类列表（启用状态，按排序）
     */
    List<Category> listCategories(Long shopId);

    /**
     * 按门店 + 分类查询菜品列表（上架状态）
     */
    List<Dish> listDishes(Long shopId, Long categoryId);
}
