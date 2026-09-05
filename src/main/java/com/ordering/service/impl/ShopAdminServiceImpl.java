package com.ordering.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.ordering.entity.Category;
import com.ordering.entity.Dish;
import com.ordering.entity.DishSpecGroup;
import com.ordering.entity.DishSpecOption;
import com.ordering.entity.DiningTable;
import com.ordering.mapper.CategoryMapper;
import com.ordering.mapper.DiningTableMapper;
import com.ordering.mapper.DishMapper;
import com.ordering.mapper.DishSpecGroupMapper;
import com.ordering.mapper.DishSpecOptionMapper;
import com.ordering.service.DishSpecService;
import com.ordering.service.ShopAdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * 商家管理服务实现
 */
@Service
@RequiredArgsConstructor
public class ShopAdminServiceImpl implements ShopAdminService {

    private final CategoryMapper categoryMapper;
    private final DishMapper dishMapper;
    private final DiningTableMapper diningTableMapper;
    private final DishSpecGroupMapper dishSpecGroupMapper;
    private final DishSpecOptionMapper dishSpecOptionMapper;
    private final DishSpecService dishSpecService;

    @Override
    public List<Category> listCategories(Long shopId) {
        return categoryMapper.selectList(
                new LambdaQueryWrapper<Category>()
                        .eq(Category::getShopId, shopId)
                        .orderByAsc(Category::getSortOrder)
        );
    }

    @Override
    public Category saveCategory(Category category) {
        if (category.getId() == null) {
            if (category.getStatus() == null) {
                category.setStatus(1);
            }
            if (category.getSortOrder() == null) {
                category.setSortOrder(0);
            }
            categoryMapper.insert(category);
        } else {
            categoryMapper.updateById(category);
        }
        return category;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteCategory(Long id) {
        // 删除分类前，先检查是否有关联菜品（简单处理：直接删除分类）
        categoryMapper.deleteById(id);
    }

    @Override
    public List<Dish> listDishes(Long shopId) {
        List<Dish> dishes = dishMapper.selectList(
                new LambdaQueryWrapper<Dish>()
                        .eq(Dish::getShopId, shopId)
                        .orderByAsc(Dish::getCategoryId)
        );
        // 附带规格组与选项，供编辑弹窗回显；商家后台需要看到已停用规格
        dishSpecService.fillSpecsForAdmin(dishes);
        return dishes;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Dish saveDish(Dish dish) {
        if (dish.getId() == null) {
            if (dish.getStatus() == null) {
                dish.setStatus(1);
            }
            if (dish.getSoldCount() == null) {
                dish.setSoldCount(0);
            }
            if (dish.getStock() == null) {
                dish.setStock(0);
            }
            if (dish.getIsRecommend() == null) {
                dish.setIsRecommend(0);
            }
            dishMapper.insert(dish);
        } else {
            dishMapper.updateById(dish);
        }
        // 保存规格配置：前端传了 specs 才处理（空数组 = 清空该菜品规格）
        if (dish.getSpecs() != null) {
            saveDishSpecs(dish.getId(), dish.getSpecs());
        }
        return dish;
    }

    /**
     * 覆盖式保存菜品规格：先删旧规格，再按传入列表重建
     */
    private void saveDishSpecs(Long dishId, List<DishSpecGroup> specs) {
        List<DishSpecGroup> oldGroups = dishSpecGroupMapper.selectList(
                new LambdaQueryWrapper<DishSpecGroup>().eq(DishSpecGroup::getDishId, dishId));
        List<Long> oldGroupIds = oldGroups.stream().map(DishSpecGroup::getId).collect(Collectors.toList());
        if (!oldGroupIds.isEmpty()) {
            dishSpecOptionMapper.delete(
                    new LambdaQueryWrapper<DishSpecOption>().in(DishSpecOption::getGroupId, oldGroupIds));
            dishSpecGroupMapper.delete(
                    new LambdaQueryWrapper<DishSpecGroup>().in(DishSpecGroup::getId, oldGroupIds));
        }
        if (specs == null || specs.isEmpty()) {
            return;
        }
        int gsort = 0;
        for (DishSpecGroup g : specs) {
            DishSpecGroup ng = new DishSpecGroup();
            ng.setDishId(dishId);
            ng.setName(g.getName());
            ng.setType(g.getType() == null ? 1 : g.getType());
            ng.setRequired(g.getRequired() == null ? 0 : g.getRequired());
            ng.setMinSelect(g.getMinSelect() == null ? 1 : g.getMinSelect());
            ng.setMaxSelect(g.getMaxSelect() == null ? 1 : g.getMaxSelect());
            ng.setSortOrder(g.getSortOrder() == null ? gsort++ : g.getSortOrder());
            ng.setStatus(g.getStatus() == null ? 1 : g.getStatus());
            dishSpecGroupMapper.insert(ng);
            if (g.getOptions() == null) {
                continue;
            }
            int osort = 0;
            for (DishSpecOption o : g.getOptions()) {
                DishSpecOption no = new DishSpecOption();
                no.setGroupId(ng.getId());
                no.setDishId(o.getDishId());
                no.setName(o.getName());
                no.setPriceDelta(o.getPriceDelta() == null ? BigDecimal.ZERO : o.getPriceDelta());
                no.setSortOrder(o.getSortOrder() == null ? osort++ : o.getSortOrder());
                no.setStatus(o.getStatus() == null ? 1 : o.getStatus());
                dishSpecOptionMapper.insert(no);
            }
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteDish(Long id) {
        dishMapper.deleteById(id);
    }

    @Override
    public List<DiningTable> listTables(Long shopId) {
        return diningTableMapper.selectList(
                new LambdaQueryWrapper<DiningTable>()
                        .eq(DiningTable::getShopId, shopId)
                        .orderByAsc(DiningTable::getTableNo)
        );
    }

    @Override
    public DiningTable saveTable(DiningTable table) {
        if (table.getId() == null) {
            if (table.getQrCode() == null || table.getQrCode().isEmpty()) {
                // 自动生成二维码标识
                table.setQrCode("T" + UUID.randomUUID().toString().replace("-", "").substring(0, 16));
            }
            if (table.getStatus() == null) {
                table.setStatus(1);
            }
            if (table.getSeatCount() == null) {
                table.setSeatCount(4);
            }
            diningTableMapper.insert(table);
        } else {
            diningTableMapper.updateById(table);
        }
        return table;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteTable(Long id) {
        diningTableMapper.deleteById(id);
    }
}
