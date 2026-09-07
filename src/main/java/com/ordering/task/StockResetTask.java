package com.ordering.task;

import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.ordering.entity.Dish;
import com.ordering.mapper.DishMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * 库存每日重置定时任务
 * 每天凌晨3点，将所有上架中的菜品库存重置为999，下架的菜品不处理
 */
@Component
public class StockResetTask {

    private static final Logger log = LoggerFactory.getLogger(StockResetTask.class);

    @Autowired
    private DishMapper dishMapper;

    /**
     * 每天凌晨3点执行
     * cron: 秒 分 时 日 月 周
     */
    @Scheduled(cron = "0 0 3 * * ?")
    public void resetStockDaily() {
        log.info("开始执行每日库存重置任务...");
        try {
            int count = dishMapper.update(null,
                    new LambdaUpdateWrapper<Dish>()
                            .eq(Dish::getStatus, 1)
                            .set(Dish::getStock, 999));
            log.info("每日库存重置完成，共重置 {} 个上架菜品的库存为999", count);
        } catch (Exception e) {
            log.error("每日库存重置任务失败", e);
        }
    }
}
