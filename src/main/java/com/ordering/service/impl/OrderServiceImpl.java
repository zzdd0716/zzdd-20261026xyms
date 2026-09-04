package com.ordering.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.ordering.dto.CashierRowDTO;
import com.ordering.dto.CashierSummaryDTO;
import com.ordering.dto.OrderCreateDTO;
import com.ordering.dto.OrderItemDTO;
import com.ordering.dto.SalesRowDTO;
import com.ordering.dto.SalesSummaryDTO;
import com.ordering.entity.Dish;
import com.ordering.entity.OrderItem;
import com.ordering.entity.Orders;
import com.ordering.mapper.DishMapper;
import com.ordering.mapper.OrderItemMapper;
import com.ordering.mapper.OrdersMapper;
import com.ordering.service.DishSpecService;
import com.ordering.service.OrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.stream.Collectors;

/**
 * 订单服务实现
 */
@Service
@RequiredArgsConstructor
public class OrderServiceImpl implements OrderService {

    private final OrdersMapper ordersMapper;
    private final OrderItemMapper orderItemMapper;
    private final DishMapper dishMapper;
    private final DishSpecService dishSpecService;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Orders createOrder(OrderCreateDTO dto) {
        // 1. 生成订单编号
        String orderNo = generateOrderNo(dto.getShopId());

        // 2. 校验菜品+规格并计算总金额（以数据库价格+规格加价为准）
        BigDecimal total = BigDecimal.ZERO;
        List<DishSpecService.ResolveResult> specResults = new ArrayList<>();
        for (OrderItemDTO item : dto.getItems()) {
            Dish dish = dishMapper.selectById(item.getDishId());
            if (dish == null || dish.getStatus() != 1) {
                throw new RuntimeException("菜品不存在或已下架: " + item.getDishId());
            }
            // 校验规格选择、计算加价、生成规格快照
            DishSpecService.ResolveResult spec = dishSpecService.resolve(dish.getId(), item.getSpecOptionIds());
            specResults.add(spec);
            BigDecimal unit = dish.getPrice().add(spec.getPriceDelta());
            total = total.add(unit.multiply(BigDecimal.valueOf(item.getQuantity())));
        }

        // 3. 创建订单主表（首期状态直接置为 1=已支付待制作，真实支付对接后改为 0=待支付）
        Orders order = new Orders();
        order.setOrderNo(orderNo);
        order.setShopId(dto.getShopId());
        order.setTableId(dto.getTableId());
        order.setUserId(dto.getUserId());
        order.setTotalAmount(total);
        order.setStatus(1);
        order.setRemark(dto.getRemark());
        order.setPayTime(LocalDateTime.now());
        ordersMapper.insert(order);

        // 4. 写入订单明细
        for (int i = 0; i < dto.getItems().size(); i++) {
            OrderItemDTO item = dto.getItems().get(i);
            Dish dish = dishMapper.selectById(item.getDishId());
            DishSpecService.ResolveResult spec = specResults.get(i);
            BigDecimal unit = dish.getPrice().add(spec.getPriceDelta());

            OrderItem oi = new OrderItem();
            oi.setOrderId(order.getId());
            oi.setDishId(dish.getId());
            oi.setDishName(dish.getName());
            oi.setDishImage(dish.getImage());
            oi.setPrice(unit);
            oi.setSpecText(spec.getSpecText());
            oi.setRemark(item.getRemark());
            oi.setQuantity(item.getQuantity());
            oi.setSubtotal(unit.multiply(BigDecimal.valueOf(item.getQuantity())));
            oi.setStatus(0);
            orderItemMapper.insert(oi);

            // 累加销量
            dish.setSoldCount(dish.getSoldCount() + item.getQuantity());
            dishMapper.updateById(dish);
        }

        return order;
    }

    @Override
    public Orders getOrderDetail(Long orderId) {
        return ordersMapper.selectById(orderId);
    }

    @Override
    public List<OrderItem> listItemsByOrderId(Long orderId) {
        return orderItemMapper.selectList(
                new LambdaQueryWrapper<OrderItem>()
                        .eq(OrderItem::getOrderId, orderId)
                        .orderByAsc(OrderItem::getId)
        );
    }

    @Override
    public List<Orders> listOrdersByStatus(Integer status) {
        LambdaQueryWrapper<Orders> wrapper = new LambdaQueryWrapper<>();
        if (status != null) {
            wrapper.eq(Orders::getStatus, status);
        }
        wrapper.orderByDesc(Orders::getCreateTime);
        List<Orders> list = ordersMapper.selectList(wrapper);
        if (list != null && !list.isEmpty()) {
            // 批量带出明细，供后厨/商家在列表直接查看下单内容
            List<Long> orderIds = list.stream().map(Orders::getId).collect(Collectors.toList());
            List<OrderItem> allItems = orderItemMapper.selectList(
                    new LambdaQueryWrapper<OrderItem>()
                            .in(OrderItem::getOrderId, orderIds)
                            .orderByAsc(OrderItem::getId)
            );
            Map<Long, List<OrderItem>> grouped = allItems.stream()
                    .collect(Collectors.groupingBy(OrderItem::getOrderId));
            list.forEach(o -> o.setItems(grouped.getOrDefault(o.getId(), Collections.emptyList())));
        }
        return list;
    }

    @Override
    public void updateOrderStatus(Long orderId, Integer status) {
        Orders order = new Orders();
        order.setId(orderId);
        order.setStatus(status);
        if (status == 4) {
            order.setFinishTime(LocalDateTime.now());
        }
        ordersMapper.updateById(order);
    }

    @Override
    public void updateItemStatus(Long itemId, Integer status) {
        OrderItem item = new OrderItem();
        item.setId(itemId);
        item.setStatus(status);
        orderItemMapper.updateById(item);
    }

    @Override
    public CashierSummaryDTO cashierSummary(String period) {
        // 有效订单 = 排除已取消(5)/已退款(6)
        List<Orders> orders = ordersMapper.selectList(
                new LambdaQueryWrapper<Orders>()
                        .notIn(Orders::getStatus, Arrays.asList(5, 6))
                        .orderByAsc(Orders::getCreateTime)
        );
        Map<String, BigDecimal> amounts = new TreeMap<>();
        Map<String, Integer> counts = new TreeMap<>();
        Map<String, String> labels = new TreeMap<>();
        BigDecimal total = BigDecimal.ZERO;
        int totalOrders = 0;
        for (Orders o : orders) {
            LocalDateTime ct = o.getCreateTime();
            if (ct == null) continue;
            BigDecimal amt = o.getTotalAmount() == null ? BigDecimal.ZERO : o.getTotalAmount();
            total = total.add(amt);
            totalOrders++;
            String[] kl = periodKey(period, ct);
            amounts.merge(kl[0], amt, BigDecimal::add);
            counts.merge(kl[0], 1, Integer::sum);
            labels.put(kl[0], kl[1]);
        }
        List<CashierRowDTO> rows = new ArrayList<>();
        for (String key : amounts.keySet()) {
            CashierRowDTO r = new CashierRowDTO();
            r.setKey(key);
            r.setLabel(labels.get(key));
            r.setAmount(amounts.get(key));
            r.setCount(counts.get(key));
            rows.add(r);
        }
        CashierSummaryDTO dto = new CashierSummaryDTO();
        dto.setTotalAmount(total);
        dto.setTotalOrders(totalOrders);
        dto.setRows(rows);
        return dto;
    }

    @Override
    public SalesSummaryDTO salesSummary(String period, Integer limit) {
        int top = (limit == null || limit < 1) ? 5 : limit;
        LocalDateTime now = LocalDateTime.now();
        String nowKey = periodKey(period, now)[0];
        // 当前周期内的有效订单
        List<Orders> orders = ordersMapper.selectList(
                new LambdaQueryWrapper<Orders>().notIn(Orders::getStatus, Arrays.asList(5, 6)));
        List<Long> orderIds = new ArrayList<>();
        for (Orders o : orders) {
            LocalDateTime ct = o.getCreateTime();
            if (ct != null && periodKey(period, ct)[0].equals(nowKey)) {
                orderIds.add(o.getId());
            }
        }
        // 聚合各菜品销量与销售额（金额按分存储避免浮点误差）
        Map<String, long[]> agg = new HashMap<>(); // name -> [qty, amount分]
        if (!orderIds.isEmpty()) {
            List<OrderItem> items = orderItemMapper.selectList(
                    new LambdaQueryWrapper<OrderItem>().in(OrderItem::getOrderId, orderIds));
            for (OrderItem it : items) {
                String name = it.getDishName();
                if (name == null || name.isEmpty()) continue;
                int qty = it.getQuantity() == null ? 0 : it.getQuantity();
                long amt = it.getSubtotal() == null
                        ? 0L : it.getSubtotal().multiply(BigDecimal.valueOf(100)).longValue();
                long[] v = agg.computeIfAbsent(name, k -> new long[]{0L, 0L});
                v[0] += qty;
                v[1] += amt;
            }
        }
        List<Map.Entry<String, long[]>> sorted = new ArrayList<>(agg.entrySet());
        sorted.sort((a, b) -> {
            int c = Long.compare(b.getValue()[0], a.getValue()[0]); // 销量降序
            return c != 0 ? c : Long.compare(b.getValue()[1], a.getValue()[1]);
        });
        List<SalesRowDTO> rows = new ArrayList<>();
        long totalQty = 0;
        long topQty = 0, topAmt = 0, otherQty = 0, otherAmt = 0;
        for (int i = 0; i < sorted.size(); i++) {
            Map.Entry<String, long[]> e = sorted.get(i);
            totalQty += e.getValue()[0];
            if (i < top) {
                topQty += e.getValue()[0];
                topAmt += e.getValue()[1];
                SalesRowDTO r = new SalesRowDTO();
                r.setName(e.getKey());
                r.setQuantity((int) e.getValue()[0]);
                r.setAmount(BigDecimal.valueOf(e.getValue()[1], 2));
                rows.add(r);
            } else {
                otherQty += e.getValue()[0];
                otherAmt += e.getValue()[1];
            }
        }
        if (otherQty > 0) {
            SalesRowDTO r = new SalesRowDTO();
            r.setName("其他");
            r.setQuantity((int) otherQty);
            r.setAmount(BigDecimal.valueOf(otherAmt, 2));
            rows.add(r);
        }
        SalesSummaryDTO dto = new SalesSummaryDTO();
        dto.setTotalQuantity((int) totalQty);
        dto.setRows(rows);
        return dto;
    }

    /** 计算订单所属周期标识与展示文案 */
    private String[] periodKey(String period, LocalDateTime ct) {
        LocalDate d = ct.toLocalDate();
        if ("week".equals(period)) {
            LocalDate mon = d.minusDays(d.getDayOfWeek().getValue() - 1L);
            LocalDate sun = mon.plusDays(6);
            return new String[]{ mon.toString(), mon + " ~ " + sun };
        }
        if ("month".equals(period)) {
            YearMonth ym = YearMonth.from(d);
            return new String[]{ ym.toString(), ym.getYear() + "年" + ym.getMonthValue() + "月" };
        }
        if ("quarter".equals(period)) {
            int q = (d.getMonthValue() - 1) / 3 + 1;
            return new String[]{ d.getYear() + "Q" + q, d.getYear() + "年第" + q + "季度" };
        }
        return new String[]{ d.toString(), d.toString() };
    }

    /**
     * 生成订单编号：年月日.x —— x 为当天第几单（按当天已有最大序号 +1）
     */
    private synchronized String generateOrderNo(Long shopId) {
        String date = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        List<Orders> todays = ordersMapper.selectList(
                new QueryWrapper<Orders>()
                        .likeRight("order_no", date + ".")
                        .orderByDesc("LENGTH(order_no)")
                        .orderByDesc("order_no")
                        .last("LIMIT 1"));
        int seq = 1;
        if (!todays.isEmpty()) {
            String no = todays.get(0).getOrderNo();
            int dot = no.indexOf('.');
            if (dot >= 0 && no.substring(dot + 1).matches("\\d+")) {
                seq = Integer.parseInt(no.substring(dot + 1)) + 1;
            }
        }
        return date + "." + seq;
    }
}
