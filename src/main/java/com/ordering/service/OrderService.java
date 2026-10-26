package com.ordering.service;

import com.ordering.dto.CashierSummaryDTO;
import com.ordering.dto.OrderCreateDTO;
import com.ordering.dto.SalesSummaryDTO;
import com.ordering.entity.OrderItem;
import com.ordering.entity.Orders;

import java.util.List;

/**
 * 订单服务：顾客下单、后厨接单
 */
public interface OrderService {

    /**
     * 顾客下单（含明细），返回创建的订单
     */
    Orders createOrder(OrderCreateDTO dto);

    /**
     * 按订单ID查询订单及明细
     */
    Orders getOrderDetail(Long orderId);

    /**
     * 按订单ID查询订单明细列表（含规格快照，供后厨/商家查看）
     */
    List<OrderItem> listItemsByOrderId(Long orderId);

    /**
     * 查询订单列表（按时间倒序）
     *
     * @param status 订单状态过滤（可空，为空查全部）
     * @param userId 下单用户ID过滤（可空；小程序"我的订单"按此过滤，商家端传空查全部）
     */
    List<Orders> listOrdersByStatus(Integer status, Long userId);

    /**
     * 更新订单状态（接单 / 制作中 / 上菜 / 完成）
     */
    void updateOrderStatus(Long orderId, Integer status);

    /**
     * 更新明细制作状态
     */
    void updateItemStatus(Long itemId, Integer status);

    /**
     * 收银统计：按日/周/月/季度汇总入账（仅统计有效订单，排除已取消/已退款）
     * 传了 startDate/endDate 则按自定义时间段查询
     */
    CashierSummaryDTO cashierSummary(String period, String startDate, String endDate);

    /**
     * 菜品销量统计：统计当前周期内各菜品销量（前N名 + 其余合并为"其他"）
     * 传了 startDate/endDate 则按自定义时间段查询
     */
    SalesSummaryDTO salesSummary(String period, Integer limit, String startDate, String endDate);
}
