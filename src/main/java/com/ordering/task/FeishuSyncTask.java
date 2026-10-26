package com.ordering.task;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.ordering.common.FeishuApiClient;
import com.ordering.entity.Orders;
import com.ordering.mapper.OrdersMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 飞书多维表格数据同步定时任务
 * 每天凌晨2点，把前一天的订单数据同步到飞书多维表格
 */
@Component
public class FeishuSyncTask {

    private static final Logger log = LoggerFactory.getLogger(FeishuSyncTask.class);

    // 订单记录表的 table_id（对应飞书多维表格里的订单记录表）
    private static final String ORDER_TABLE_ID = "tblJSJMN08TDjek1";

    @Autowired
    private OrdersMapper ordersMapper;

    @Autowired
    private FeishuApiClient feishuApiClient;

    /**
     * 每天凌晨2点执行，同步昨天的订单数据
     * cron: 秒 分 时 日 月 周
     */
    @Scheduled(cron = "0 0 2 * * ?")
    public void syncYesterdayOrders() {
        log.info("开始同步昨日订单数据到飞书...");
        try {
            // 1. 查询昨天的所有订单
            LocalDateTime yesterdayStart = LocalDate.now().minusDays(1).atStartOfDay();
            LocalDateTime yesterdayEnd = LocalDate.now().atStartOfDay();

            List<Orders> orderList = ordersMapper.selectList(
                    new LambdaQueryWrapper<Orders>()
                            .ge(Orders::getCreateTime, yesterdayStart)
                            .lt(Orders::getCreateTime, yesterdayEnd)
            );

            log.info("查询到昨日共 {} 笔订单", orderList.size());

            // 2. 把订单转换成飞书需要的格式
            List<Map<String, Object>> records = new ArrayList<>();
            for (Orders order : orderList) {
                Map<String, Object> record = new HashMap<>();
                record.put("订单编号", order.getOrderNo());
                record.put("订单金额", order.getTotalAmount());
                record.put("订单状态", order.getStatus());
                record.put("下单时间", order.getCreateTime());
                records.add(record);
            }

            // 3. 调用飞书 API，批量写入
            if (!records.isEmpty()) {
                feishuApiClient.batchCreateRecords(ORDER_TABLE_ID, records);
                log.info("昨日订单数据同步飞书完成");
            } else {
                log.info("昨日没有订单，无需同步");
            }

        } catch (Exception e) {
            log.error("同步昨日订单到飞书失败", e);
        }
    }
}
