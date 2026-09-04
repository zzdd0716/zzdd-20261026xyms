package com.ordering.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 菜品规格组：一个菜品可配置多个规格组（如 辣度/双拼/份量）
 * type：1单选 2多选 3双拼（双拼=从候选里选2个拼一份）
 */
@Data
@TableName("dish_spec_group")
public class DishSpecGroup {

    @TableId(type = IdType.AUTO)
    private Long id;

    /** 所属菜品ID */
    private Long dishId;

    /** 规格组名称，如 辣度/双拼/份量 */
    private String name;

    /** 类型：1单选 2多选 3双拼 */
    private Integer type;

    /** 是否必选：1必选 0可选 */
    private Integer required;

    /** 最少选择数（双拼通常为2） */
    private Integer minSelect;

    /** 最多选择数（0表示不限，多选常用） */
    private Integer maxSelect;

    /** 排序值 */
    private Integer sortOrder;

    /** 状态：1启用 0停用 */
    private Integer status;

    private LocalDateTime createTime;

    private LocalDateTime updateTime;

    /** 该规格组下的选项（非表字段） */
    @TableField(exist = false)
    private List<DishSpecOption> options;
}
