package com.ordering.dto;

import lombok.Data;

import java.math.BigDecimal;

/**
 * 收银统计 - 单周期入账明细行
 */
@Data
public class CashierRowDTO {
    /** 周期标识（day: YYYY-MM-DD / week: 周一日期 / month: YYYY-MM / quarter: YYYYQn） */
    private String key;
    /** 周期展示文案，如 2026-09-04 / 2026-08-31 ~ 09-06 / 2026年9月 / 2026年第3季度 */
    private String label;
    /** 该周期入账金额 */
    private BigDecimal amount;
    /** 该周期订单数 */
    private Integer count;
}
