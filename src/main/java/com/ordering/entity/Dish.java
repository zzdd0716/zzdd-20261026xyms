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
 * 菜品实体
 */
@Data
@TableName("dish")
public class Dish {

    @TableId(type = IdType.AUTO)
    private Long id;

    /** 所属门店ID */
    private Long shopId;

    /** 所属分类ID */
    private Long categoryId;

    /** 菜品名称 */
    private String name;

    /** 菜品描述 */
    private String description;

    /** 菜品图片 */
    private String image;

    /** 价格 */
    private BigDecimal price;

    /** 库存，0表示不限量 */
    private Integer stock;

    /** 累计销量 */
    private Integer soldCount;

    /** 是否推荐：1推荐 0普通 */
    private Integer isRecommend;

    /** 状态：1上架 0下架 */
    private Integer status;

    /** 规格组列表（非表字段，查询时附带：含 辣度/双拼/份量 等） */
    @TableField(exist = false)
    private List<DishSpecGroup> specs;

    private LocalDateTime createTime;

    private LocalDateTime updateTime;
}
