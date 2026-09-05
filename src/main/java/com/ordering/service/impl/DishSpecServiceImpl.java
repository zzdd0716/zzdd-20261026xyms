package com.ordering.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.ordering.entity.Dish;
import com.ordering.entity.DishSpecGroup;
import com.ordering.entity.DishSpecOption;
import com.ordering.mapper.DishSpecGroupMapper;
import com.ordering.mapper.DishSpecOptionMapper;
import com.ordering.service.DishSpecService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 菜品规格服务实现
 */
@Service
@RequiredArgsConstructor
public class DishSpecServiceImpl implements DishSpecService {

    private final DishSpecGroupMapper groupMapper;
    private final DishSpecOptionMapper optionMapper;

    @Override
    public void fillSpecs(List<Dish> dishes) {
        fillSpecsInternal(dishes, true);
    }

    @Override
    public void fillSpecsForAdmin(List<Dish> dishes) {
        fillSpecsInternal(dishes, false);
    }

    private void fillSpecsInternal(List<Dish> dishes, boolean enabledOnly) {
        if (dishes == null || dishes.isEmpty()) {
            return;
        }
        List<Long> dishIds = dishes.stream().map(Dish::getId).collect(Collectors.toList());
        LambdaQueryWrapper<DishSpecGroup> groupWrapper = new LambdaQueryWrapper<DishSpecGroup>()
                .in(DishSpecGroup::getDishId, dishIds);
        if (enabledOnly) {
            groupWrapper.eq(DishSpecGroup::getStatus, 1);
        }
        groupWrapper.orderByAsc(DishSpecGroup::getDishId)
                .orderByAsc(DishSpecGroup::getSortOrder);
        List<DishSpecGroup> groups = groupMapper.selectList(groupWrapper);
        if (groups.isEmpty()) {
            return;
        }
        List<Long> groupIds = groups.stream().map(DishSpecGroup::getId).collect(Collectors.toList());
        LambdaQueryWrapper<DishSpecOption> optionWrapper = new LambdaQueryWrapper<DishSpecOption>()
                .in(DishSpecOption::getGroupId, groupIds);
        if (enabledOnly) {
            optionWrapper.eq(DishSpecOption::getStatus, 1);
        }
        optionWrapper.orderByAsc(DishSpecOption::getGroupId)
                .orderByAsc(DishSpecOption::getSortOrder);
        List<DishSpecOption> options = optionMapper.selectList(optionWrapper);
        Map<Long, List<DishSpecOption>> optByGroup = options.stream()
                .collect(Collectors.groupingBy(DishSpecOption::getGroupId));
        Map<Long, List<DishSpecGroup>> groupsByDish = groups.stream()
                .collect(Collectors.groupingBy(DishSpecGroup::getDishId));
        for (DishSpecGroup g : groups) {
            g.setOptions(optByGroup.getOrDefault(g.getId(), Collections.emptyList()));
        }
        for (Dish d : dishes) {
            d.setSpecs(groupsByDish.getOrDefault(d.getId(), Collections.emptyList()));
        }
    }

    @Override
    public List<DishSpecGroup> listGroupsWithOptions(Long dishId) {
        List<DishSpecGroup> groups = groupMapper.selectList(
                new LambdaQueryWrapper<DishSpecGroup>()
                        .eq(DishSpecGroup::getDishId, dishId)
                        .eq(DishSpecGroup::getStatus, 1)
                        .orderByAsc(DishSpecGroup::getSortOrder)
        );
        if (groups.isEmpty()) {
            return groups;
        }
        List<Long> groupIds = groups.stream().map(DishSpecGroup::getId).collect(Collectors.toList());
        List<DishSpecOption> options = optionMapper.selectList(
                new LambdaQueryWrapper<DishSpecOption>()
                        .in(DishSpecOption::getGroupId, groupIds)
                        .eq(DishSpecOption::getStatus, 1)
                        .orderByAsc(DishSpecOption::getSortOrder)
        );
        Map<Long, List<DishSpecOption>> optByGroup = options.stream()
                .collect(Collectors.groupingBy(DishSpecOption::getGroupId));
        for (DishSpecGroup g : groups) {
            g.setOptions(optByGroup.getOrDefault(g.getId(), Collections.emptyList()));
        }
        return groups;
    }

    @Override
    public ResolveResult resolve(Long dishId, List<Long> optionIds) {
        List<DishSpecGroup> groups = listGroupsWithOptions(dishId);

        // 汇总该菜品所有启用规格选项：id -> option，group_id -> options
        Map<Long, DishSpecOption> allOpts = new HashMap<>();
        for (DishSpecGroup g : groups) {
            for (DishSpecOption o : g.getOptions()) {
                allOpts.put(o.getId(), o);
            }
        }

        // 按规格组归集已选选项
        Map<Long, Set<Long>> selByGroup = new HashMap<>();
        if (optionIds != null) {
            for (Long oid : optionIds) {
                DishSpecOption opt = allOpts.get(oid);
                if (opt == null) {
                    throw new RuntimeException("规格选项不存在: " + oid);
                }
                selByGroup.computeIfAbsent(opt.getGroupId(), k -> new LinkedHashSet<>()).add(oid);
            }
        }

        BigDecimal delta = BigDecimal.ZERO;
        StringBuilder text = new StringBuilder();
        for (DishSpecGroup g : groups) {
            Set<Long> sel = selByGroup.getOrDefault(g.getId(), Collections.emptySet());
            int cnt = sel.size();
            boolean isShuangpin = g.getType() != null && g.getType() == 3;
            if (cnt == 0) {
                // 双拼不强制必选：顾客可单点不拼
                if (!isShuangpin && g.getRequired() != null && g.getRequired() == 1) {
                    throw new RuntimeException("请选择规格「" + g.getName() + "」");
                }
                continue;
            }
            if (cnt < g.getMinSelect()) {
                // 双拼不强制最少2项：可单点也可双拼
                if (!isShuangpin) {
                    throw new RuntimeException("规格「" + g.getName() + "」至少选择 " + g.getMinSelect() + " 项");
                }
            }
            if (g.getMaxSelect() != null && g.getMaxSelect() > 0 && cnt > g.getMaxSelect()) {
                throw new RuntimeException("规格「" + g.getName() + "」最多选择 " + g.getMaxSelect() + " 项");
            }
            List<String> names = new ArrayList<>();
            for (DishSpecOption o : g.getOptions()) {
                if (sel.contains(o.getId())) {
                    names.add(o.getName());
                    BigDecimal pd = o.getPriceDelta() == null ? BigDecimal.ZERO : o.getPriceDelta();
                    delta = delta.add(pd);
                }
            }
            text.append(g.getName()).append(":").append(String.join("+", names)).append("；");
        }
        String specText = text.length() > 0 ? text.substring(0, text.length() - 1) : null;
        return new ResolveResult(delta, specText);
    }
}
