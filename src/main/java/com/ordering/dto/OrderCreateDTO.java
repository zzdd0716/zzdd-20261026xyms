package com.ordering.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

/**
 * 下单请求
 */
@Data
public class OrderCreateDTO {

    @NotNull(message = "门店ID不能为空")
    private Long shopId;

    @NotNull(message = "桌台ID不能为空")
    private Long tableId;

    /** 下单用户ID（可空） */
    private Long userId;

    /** 备注 */
    private String remark;

    @NotEmpty(message = "订单明细不能为空")
    @Valid
    private List<OrderItemDTO> items;
}
