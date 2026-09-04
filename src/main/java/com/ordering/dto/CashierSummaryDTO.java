package com.ordering.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

/**
 * 收银统计汇总
 */
@Data
public class CashierSummaryDTO {
    /** 总入账金额（全部有效订单） */
    private BigDecimal totalAmount;
    /** 总订单数 */
    private Integer totalOrders;
    /** 按周期分组的入账明细（时间升序） */
    private List<CashierRowDTO> rows;
}
