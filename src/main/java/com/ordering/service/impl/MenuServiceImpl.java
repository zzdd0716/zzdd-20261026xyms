package com.ordering.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.ordering.entity.Category;
import com.ordering.entity.Dish;
import com.ordering.mapper.CategoryMapper;
import com.ordering.mapper.DishMapper;
import com.ordering.service.DishSpecService;
import com.ordering.service.MenuService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * 菜单服务实现
 */
@Service
@RequiredArgsConstructor
public class MenuServiceImpl implements MenuService {

    private final CategoryMapper categoryMapper;
    private final DishMapper dishMapper;
    private final DishSpecService dishSpecService;

    @Override
    public List<Category> listCategories(Long shopId) {
        return categoryMapper.selectList(
                new LambdaQueryWrapper<Category>()
                        .eq(Category::getShopId, shopId)
                        .eq(Category::getStatus, 1)
                        .orderByAsc(Category::getSortOrder)
        );
    }

    @Override
    public List<Dish> listDishes(Long shopId, Long categoryId) {
        LambdaQueryWrapper<Dish> wrapper = new LambdaQueryWrapper<Dish>()
                .eq(Dish::getShopId, shopId)
                .eq(Dish::getStatus, 1);
        if (categoryId != null) {
            wrapper.eq(Dish::getCategoryId, categoryId);
        }
        wrapper.orderByAsc(Dish::getCategoryId);
        List<Dish> dishes = dishMapper.selectList(wrapper);
        // 附带规格组与选项（选规格/双拼）
        dishSpecService.fillSpecs(dishes);
        return dishes;
    }
}
