package com.ordering.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 订单实体
 */
@Data
@TableName("orders")
public class Orders {

    @TableId(type = IdType.AUTO)
    private Long id;

    /** 订单编号 */
    private String orderNo;

    /** 门店ID */
    private Long shopId;

    /** 桌台ID */
    private Long tableId;

    /** 下单用户ID */
    private Long userId;

    /** 订单总金额 */
    private BigDecimal totalAmount;

    /** 状态：0待支付 1已支付待制作 2制作中 3已上菜 4已完成 5已取消 6已退款 */
    private Integer status;

    /** 顾客备注 */
    private String remark;

    /** 支付时间 */
    private LocalDateTime payTime;

    /** 完成时间 */
    private LocalDateTime finishTime;

    private LocalDateTime createTime;

    private LocalDateTime updateTime;

    /** 订单明细（列表查询时附带，非表字段；供后厨/商家在列表直接查看下单内容） */
    @TableField(exist = false)
    private List<OrderItem> items;
}
