package com.ordering.service;

import com.ordering.entity.Dish;
import com.ordering.entity.DishSpecGroup;

import java.math.BigDecimal;
import java.util.List;

/**
 * 菜品规格服务：规格查询、校验与加价计算
 */
public interface DishSpecService {

    /** 批量给菜品填充规格（组+选项，仅启用状态） */
    void fillSpecs(List<Dish> dishes);

    /** 按菜品ID加载规格（含选项，仅启用状态） */
    List<DishSpecGroup> listGroupsWithOptions(Long dishId);

    /**
     * 校验并解析规格选择
     *
     * @param dishId    菜品ID
     * @param optionIds 已选规格选项ID列表（可空/空表）
     * @return 加价合计 + 规格快照文本（如 "辣度:微辣；双拼:烧鸭+叉烧"）
     */
    ResolveResult resolve(Long dishId, List<Long> optionIds);

    /** 规格解析结果 */
    class ResolveResult {
        /** 规格加价合计 */
        private final BigDecimal priceDelta;
        /** 规格快照文本（无规格时为 null） */
        private final String specText;

        public ResolveResult(BigDecimal priceDelta, String specText) {
            this.priceDelta = priceDelta;
            this.specText = specText;
        }

        public BigDecimal getPriceDelta() {
            return priceDelta;
        }

        public String getSpecText() {
            return specText;
        }
    }
}
