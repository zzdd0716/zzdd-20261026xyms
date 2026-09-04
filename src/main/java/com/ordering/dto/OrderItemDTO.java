package com.ordering.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

/**
 * 下单明细项
 */
@Data
public class OrderItemDTO {

    @NotNull(message = "菜品ID不能为空")
    private Long dishId;

    @Min(value = 1, message = "数量至少为1")
    private Integer quantity;

    /** 下单时单价（由后端按当前菜品价+规格加价校验，避免前端篡改） */
    @DecimalMin(value = "0.01", message = "价格不合法")
    private BigDecimal price;

    /** 选择的规格选项ID列表（跨规格组；后端按组校验最少/最多选择数并计算加价） */
    private List<Long> specOptionIds;

    /** 条目备注（加入购物车时填写，可空） */
    private String remark;
}
