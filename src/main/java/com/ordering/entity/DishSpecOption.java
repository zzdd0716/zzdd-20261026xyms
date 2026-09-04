package com.ordering.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 菜品规格选项：规格组下的可选选项（可加价、可关联菜品用于双拼）
 */
@Data
@TableName("dish_spec_option")
public class DishSpecOption {

    @TableId(type = IdType.AUTO)
    private Long id;

    /** 所属规格组ID */
    private Long groupId;

    /** 关联菜品ID（双拼选项可指向可拼菜品，可空） */
    private Long dishId;

    /** 选项名称，如 微辣/大碗/烧鸭 */
    private String name;

    /** 加价（元） */
    private BigDecimal priceDelta;

    /** 排序值 */
    private Integer sortOrder;

    /** 状态：1启用 0停用 */
    private Integer status;

    private LocalDateTime createTime;

    private LocalDateTime updateTime;
}
