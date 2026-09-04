package com.ordering.dto;

import lombok.Data;

import java.util.List;

/**
 * 收银统计 - 菜品销量汇总（扇形图数据）
 */
@Data
public class SalesSummaryDTO {
    /** 总销量（份数） */
    private Integer totalQuantity;
    /** 销量排行（前N名 + 其他合并项，按销量降序） */
    private List<SalesRowDTO> rows;
}
