USE qr_ordering;

-- 订单明细表：新增 条目备注 字段（顾客加入购物车时填写的备注）
SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = 'qr_ordering' AND TABLE_NAME = 'order_item' AND COLUMN_NAME = 'remark'
);
SET @ddl = IF(@col_exists = 0,
  'ALTER TABLE `order_item` ADD COLUMN `remark` VARCHAR(200) DEFAULT NULL COMMENT ''条目备注（加入购物车时填写）'' AFTER `spec_text`',
  'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
