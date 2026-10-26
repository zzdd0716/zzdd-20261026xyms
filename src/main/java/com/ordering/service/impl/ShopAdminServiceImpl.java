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
            dishMapper.insert(dish);
        } else {
            // 检测状态变化：下架→上架 或 上架→下架，联动处理关联规格选项
            Dish oldDish = dishMapper.selectById(dish.getId());
            boolean statusChangedToUp = oldDish != null
                    && oldDish.getStatus() != null && oldDish.getStatus() == 0
                    && dish.getStatus() != null && dish.getStatus() == 1;
            boolean statusChangedToDown = oldDish != null
                    && oldDish.getStatus() != null && oldDish.getStatus() == 1
                    && dish.getStatus() != null && dish.getStatus() == 0;
            dishMapper.updateById(dish);
            if (statusChangedToUp) {
                restoreRelatedSpecOptions(dish);
            } else if (statusChangedToDown) {
                disableRelatedSpecOptions(dish);
            }
        }
        // 保存规格配置：前端传了 specs 才处理（空数组 = 清空该菜品规格）
        if (dish.getSpecs() != null) {
            saveDishSpecs(dish.getId(), dish.getSpecs());
        }
        return dish;
    }

    /**
     * 菜品重新上架时，恢复其他菜品规格组中关联到该菜品的选项
     * 匹配规则与估清下架时一致：dishId 关联 / 选项名包含菜品名 / 菜品名去后缀后匹配
     */
    private void restoreRelatedSpecOptions(Dish dish) {
        Long dishId = dish.getId();
        // 从数据库取完整菜品信息（库存管理页保存时可能没传 name）
        Dish fullDish = dishMapper.selectById(dishId);
        String dishName = fullDish != null ? fullDish.getName() : dish.getName();
        if (dishName == null || dishName.trim().isEmpty()) {
            return;
        }
        String dishNameLower = dishName.trim().toLowerCase();
        // 菜品名去后缀（饭/面/粉/汤/粥/套餐）后的核心名
        String coreName = dishNameLower.replaceAll("(饭|面|粉|汤|粥|套餐)$", "");

        // 查询所有菜品的规格组
        List<DishSpecGroup> allGroups = dishSpecGroupMapper.selectList(null);
        if (allGroups.isEmpty()) return;
        List<Long> allGroupIds = allGroups.stream().map(DishSpecGroup::getId).collect(Collectors.toList());
        List<DishSpecOption> allOptions = dishSpecOptionMapper.selectList(
                new LambdaQueryWrapper<DishSpecOption>().in(DishSpecOption::getGroupId, allGroupIds));

        boolean anyRestored = false;
        for (DishSpecOption opt : allOptions) {
            if (opt.getStatus() != null && opt.getStatus() == 1) continue; // 已启用的跳过
            boolean matched = false;
            // 方向1：dishId 关联
            if (opt.getDishId() != null && opt.getDishId().equals(dishId)) {
                matched = true;
            }
            // 方向2/3：名称匹配
            if (!matched && opt.getName() != null) {
                String optName = opt.getName().toLowerCase();
                if (optName.contains(dishNameLower)) {
                    matched = true;
                } else if (!coreName.isEmpty() && coreName.endsWith(optName)) {
                    matched = true;
                }
            }
            if (matched) {
                opt.setStatus(1);
                dishSpecOptionMapper.updateById(opt);
                anyRestored = true;
            }
        }

        // 恢复规格组状态：组内有启用选项且组处于停用状态时，恢复组
        if (anyRestored) {
            for (DishSpecGroup g : allGroups) {
                if (g.getStatus() != null && g.getStatus() == 1) continue;
                long activeCount = allOptions.stream()
                        .filter(o -> o.getGroupId().equals(g.getId()) && o.getStatus() != null && o.getStatus() == 1)
                        .count();
                if (activeCount > 0) {
                    g.setStatus(1);
                    dishSpecGroupMapper.updateById(g);
                }
            }
        }
    }

    /**
     * 菜品下架时，停用其他菜品规格组中关联到该菜品的选项
     * 匹配规则与 restoreRelatedSpecOptions 一致
     */
    private void disableRelatedSpecOptions(Dish dish) {
        Long dishId = dish.getId();
        Dish fullDish = dishMapper.selectById(dishId);
        String dishName = fullDish != null ? fullDish.getName() : dish.getName();
        if (dishName == null || dishName.trim().isEmpty()) {
            return;
        }
        String dishNameLower = dishName.trim().toLowerCase();
        String coreName = dishNameLower.replaceAll("(饭|面|粉|汤|粥|套餐)$", "");

        List<DishSpecGroup> allGroups = dishSpecGroupMapper.selectList(null);
        if (allGroups.isEmpty()) return;
        List<Long> allGroupIds = allGroups.stream().map(DishSpecGroup::getId).collect(Collectors.toList());
        List<DishSpecOption> allOptions = dishSpecOptionMapper.selectList(
                new LambdaQueryWrapper<DishSpecOption>().in(DishSpecOption::getGroupId, allGroupIds));

        boolean anyDisabled = false;
        for (DishSpecOption opt : allOptions) {
            if (opt.getStatus() != null && opt.getStatus() == 0) continue; // 已停用的跳过
            boolean matched = false;
            if (opt.getDishId() != null && opt.getDishId().equals(dishId)) {
                matched = true;
            }
            if (!matched && opt.getName() != null) {
                String optName = opt.getName().toLowerCase();
                if (optName.contains(dishNameLower)) {
                    matched = true;
                } else if (!coreName.isEmpty() && coreName.endsWith(optName)) {
                    matched = true;
                }
            }
            if (matched) {
                opt.setStatus(0);
                dishSpecOptionMapper.updateById(opt);
                anyDisabled = true;
            }
        }

        // 规格组状态联动：组内无启用选项时，停用规格组
        if (anyDisabled) {
            for (DishSpecGroup g : allGroups) {
                if (g.getStatus() != null && g.getStatus() == 0) continue;
                long activeCount = allOptions.stream()
                        .filter(o -> o.getGroupId().equals(g.getId()) && o.getStatus() != null && o.getStatus() == 1)
                        .count();
                if (activeCount == 0) {
                    g.setStatus(0);
                    dishSpecGroupMapper.updateById(g);
                }
            }
        }
    }

    /**
     * 批量更新规格选项状态（单独操作，不影响菜品状态）
     * 同时联动规格组状态：启用选项时恢复组，停用选项且组内无启用选项时停用组
     */
    @Override
    @Transactional(rollbackFor = Exception.class)
    public void updateSpecOptionsStatus(List<Long> ids, Integer status) {
        if (ids == null || ids.isEmpty()) return;
        // 更新选项状态
        dishSpecOptionMapper.update(null,
                new com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper<DishSpecOption>()
                        .in(DishSpecOption::getId, ids)
                        .set(DishSpecOption::getStatus, status));
        // 联动规格组状态
        List<DishSpecOption> updated = dishSpecOptionMapper.selectList(
                new LambdaQueryWrapper<DishSpecOption>().in(DishSpecOption::getId, ids));
        if (updated.isEmpty()) return;
        List<Long> groupIds = updated.stream().map(DishSpecOption::getGroupId).distinct().collect(Collectors.toList());
        for (Long gid : groupIds) {
            long activeCount = dishSpecOptionMapper.selectCount(
                    new LambdaQueryWrapper<DishSpecOption>()
                            .eq(DishSpecOption::getGroupId, gid)
                            .eq(DishSpecOption::getStatus, 1));
            DishSpecGroup g = dishSpecGroupMapper.selectById(gid);
            if (g == null) continue;
            if (status == 1 && activeCount > 0 && g.getStatus() == 0) {
                g.setStatus(1);
                dishSpecGroupMapper.updateById(g);
            } else if (status == 0 && activeCount == 0 && g.getStatus() == 1) {
                g.setStatus(0);
                dishSpecGroupMapper.updateById(g);
            }
        }
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
                // 自动生成顺序桌码：T001、T002……
                List<DiningTable> all = diningTableMapper.selectList(null);
                int maxNum = 0;
                for (DiningTable t : all) {
                    String code = t.getQrCode();
                    if (code != null && code.startsWith("T")) {
                        try {
                            int num = Integer.parseInt(code.substring(1));
                            if (num > maxNum) maxNum = num;
                        } catch (NumberFormatException ignored) {}
                    }
                }
                table.setQrCode(String.format("T%03d", maxNum + 1));
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
