package com.ordering.dto;

import lombok.Data;

import java.math.BigDecimal;

/**
 * 收银统计 - 单品销量行
 */
@Data
public class SalesRowDTO {
    /** 菜品名称（前N名；其余合并为"其他"） */
    private String name;
    /** 销量（份数） */
    private Integer quantity;
    /** 销售额 */
    private BigDecimal amount;
}
