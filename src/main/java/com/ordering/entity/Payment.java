package com.ordering.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 支付记录实体
 */
@Data
@TableName("payment")
public class Payment {

    @TableId(type = IdType.AUTO)
    private Long id;

    /** 订单ID */
    private Long orderId;

    /** 支付流水号 */
    private String payNo;

    /** 支付渠道：WECHAT微信支付 / MOCK模拟 */
    private String channel;

    /** 支付金额 */
    private BigDecimal amount;

    /** 状态：0待支付 1支付成功 2支付失败 3已退款 */
    private Integer status;

    /** 微信支付交易号 */
    private String transactionId;

    /** 支付完成时间 */
    private LocalDateTime payTime;

    private LocalDateTime createTime;

    private LocalDateTime updateTime;
}
