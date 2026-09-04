package com.ordering.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 订单明细实体
 */
@Data
@TableName("order_item")
public class OrderItem {

    @TableId(type = IdType.AUTO)
    private Long id;

    /** 订单ID */
    private Long orderId;

    /** 菜品ID */
    private Long dishId;

    /** 菜品名称快照 */
    private String dishName;

    /** 菜品图片快照 */
    private String dishImage;

    /** 下单单价（含规格加价） */
    private BigDecimal price;

    /** 规格快照，如 辣度:微辣；双拼:烧鸭+叉烧 */
    private String specText;

    /** 条目备注（加入购物车时填写，如 少盐/不要香菜） */
    private String remark;

    /** 数量 */
    private Integer quantity;

    /** 小计金额 */
    private BigDecimal subtotal;

    /** 制作状态：0待制作 1制作中 2已出餐 3已退菜 */
    private Integer status;

    private LocalDateTime createTime;

    private LocalDateTime updateTime;
}
