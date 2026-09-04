package com.ordering.controller;

import com.ordering.common.result.Result;
import com.ordering.dto.CashierSummaryDTO;
import com.ordering.dto.OrderCreateDTO;
import com.ordering.dto.SalesSummaryDTO;
import com.ordering.entity.OrderItem;
import com.ordering.entity.Orders;
import com.ordering.service.OrderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 订单接口：顾客下单 + 后厨接单
 */
@RestController
@RequestMapping("/api/order")
@RequiredArgsConstructor
@Tag(name = "订单（顾客+后厨）", description = "顾客下单支付 + 后厨接单与状态流转")
public class OrderController {

    private final OrderService orderService;

    /** 顾客下单 */
    @PostMapping("/create")
    @Operation(summary = "顾客下单", description = "提交订单及菜品明细，金额以数据库价格为准（前端价格仅作展示）。首期直接置为已支付待制作")
    public Result<Orders> create(@Valid @RequestBody OrderCreateDTO dto) {
        return Result.success(orderService.createOrder(dto));
    }

    /** 订单详情 */
    @GetMapping("/detail/{orderId}")
    @Operation(summary = "订单详情", description = "按订单ID查询订单主信息")
    public Result<Orders> detail(
            @Parameter(description = "订单ID", required = true, example = "1")
            @PathVariable Long orderId) {
        return Result.success(orderService.getOrderDetail(orderId));
    }

    /** 订单明细列表（含规格快照，供后厨/商家查看） */
    @GetMapping("/items/{orderId}")
    @Operation(summary = "订单明细", description = "按订单ID查询订单明细，含规格快照（如 辣度:微辣；双拼:烧鸭+叉烧）")
    public Result<List<OrderItem>> items(
            @Parameter(description = "订单ID", required = true, example = "1")
            @PathVariable Long orderId) {
        return Result.success(orderService.listItemsByOrderId(orderId));
    }

    /** 后厨：按状态查询订单（status 为空查全部） */
    @GetMapping("/list")
    @Operation(summary = "后厨查订单", description = "按状态查询订单列表，按下单时间倒序；status 为空查全部")
    public Result<List<Orders>> list(
            @Parameter(description = "订单状态：0待支付 1已支付待制作 2制作中 3已上菜 4已完成（可空）", example = "1")
            @RequestParam(required = false) Integer status) {
        return Result.success(orderService.listOrdersByStatus(status));
    }

    /** 后厨：更新订单状态 */
    @PutMapping("/status/{orderId}")
    @Operation(summary = "更新订单状态", description = "后厨接单/状态流转：1→2制作中→3已上菜→4已完成")
    public Result<Void> updateStatus(
            @Parameter(description = "订单ID", required = true, example = "1")
            @PathVariable Long orderId,
            @Parameter(description = "目标状态：2制作中 3已上菜 4已完成", required = true, example = "2")
            @RequestParam Integer status) {
        orderService.updateOrderStatus(orderId, status);
        return Result.success();
    }

    /** 后厨：更新明细制作状态 */
    @PutMapping("/item/status/{itemId}")
    @Operation(summary = "更新明细制作状态", description = "逐道菜更新制作状态：0待制作 1制作中 2已出餐 3已退菜")
    public Result<Void> updateItemStatus(
            @Parameter(description = "订单明细ID", required = true, example = "1")
            @PathVariable Long itemId,
            @Parameter(description = "目标状态：1制作中 2已出餐 3已退菜", required = true, example = "2")
            @RequestParam Integer status) {
        orderService.updateItemStatus(itemId, status);
        return Result.success();
    }

    /** 收银统计：按日/周/月/季度汇总入账 */
    @GetMapping("/cashier")
    @Operation(summary = "收银统计", description = "按日/周/月/季度汇总订单入账金额与单数（排除已取消/已退款）")
    public Result<CashierSummaryDTO> cashier(
            @Parameter(description = "周期：day 按天 / week 按周 / month 按月 / quarter 按季度（默认 day）", example = "day")
            @RequestParam(defaultValue = "day") String period) {
        return Result.success(orderService.cashierSummary(period));
    }

    /** 菜品销量统计（扇形图数据）：前N名 + 其余合并为"其他" */
    @GetMapping("/sales")
    @Operation(summary = "菜品销量统计", description = "统计当前周期内各菜品销量，返回前N名，其余合并为“其他”")
    public Result<SalesSummaryDTO> sales(
            @Parameter(description = "周期：day/week/month/quarter（默认 day）", example = "day")
            @RequestParam(defaultValue = "day") String period,
            @Parameter(description = "榜单前N名，其余合并为其他（默认5）", example = "5")
            @RequestParam(defaultValue = "5") Integer limit) {
        return Result.success(orderService.salesSummary(period, limit));
    }
}
