-- ============================================================
-- 二维码点餐系统 - 增量升级脚本（选规格 + 双拼）
-- 适用：已按 init.sql v1.0 建库并运行过首期的现有数据库
-- 执行方式：mysql -uroot -p qr_ordering < upgrade_spec.sql
-- 说明：新建规格表 + 订单明细加规格快照字段 + 给现有菜品配置示例规格
-- ============================================================

USE `qr_ordering`;

-- ------------------------------------------------------------
-- 1. 新建：菜品规格组表
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `dish_spec_group`;
CREATE TABLE `dish_spec_group` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '规格组ID',
  `dish_id`     BIGINT UNSIGNED NOT NULL                COMMENT '所属菜品ID',
  `name`        VARCHAR(50)     NOT NULL                COMMENT '规格组名称，如 辣度/双拼/份量',
  `type`        TINYINT         NOT NULL DEFAULT 1      COMMENT '类型：1单选 2多选 3双拼',
  `required`    TINYINT         NOT NULL DEFAULT 0      COMMENT '是否必选：1必选 0可选',
  `min_select`  INT             NOT NULL DEFAULT 1      COMMENT '最少选择数（双拼通常为2）',
  `max_select`  INT             NOT NULL DEFAULT 1      COMMENT '最多选择数（0表示不限，多选常用）',
  `sort_order`  INT             NOT NULL DEFAULT 0      COMMENT '排序值，越小越靠前',
  `status`      TINYINT         NOT NULL DEFAULT 1      COMMENT '状态：1启用 0停用',
  `create_time` DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_dish` (`dish_id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COMMENT='菜品规格组表';

-- ------------------------------------------------------------
-- 2. 新建：菜品规格选项表
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `dish_spec_option`;
CREATE TABLE `dish_spec_option` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '规格选项ID',
  `group_id`    BIGINT UNSIGNED NOT NULL                COMMENT '所属规格组ID',
  `dish_id`     BIGINT UNSIGNED DEFAULT NULL            COMMENT '关联菜品ID（双拼选项可指向可拼菜品，可空）',
  `name`        VARCHAR(50)     NOT NULL                COMMENT '选项名称，如 微辣/大碗/烧鸭',
  `price_delta` DECIMAL(10,2)   NOT NULL DEFAULT 0.00   COMMENT '加价（元），如 大碗+2.00',
  `sort_order`  INT             NOT NULL DEFAULT 0      COMMENT '排序值',
  `status`      TINYINT         NOT NULL DEFAULT 1      COMMENT '状态：1启用 0停用',
  `create_time` DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_group` (`group_id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COMMENT='菜品规格选项表';

-- ------------------------------------------------------------
-- 3. 订单明细表：新增 规格快照 字段（已存在则跳过）
-- ------------------------------------------------------------
SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = 'qr_ordering' AND TABLE_NAME = 'order_item' AND COLUMN_NAME = 'spec_text'
);
SET @ddl = IF(@col_exists = 0,
  'ALTER TABLE `order_item` ADD COLUMN `spec_text` VARCHAR(500) DEFAULT NULL COMMENT ''规格快照，如 辣度:微辣；双拼:烧鸭+叉烧'' AFTER `price`',
  'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ------------------------------------------------------------
-- 4. 示例规格数据（对应现有烧腊店菜品 id 1,2,3,5,6,7）
-- 规格组 type：1单选 2多选 3双拼；required：1必选 0可选
-- ------------------------------------------------------------

-- 招牌烧鹅饭(1)：双拼 可选（2选2）
INSERT INTO `dish_spec_group` (`dish_id`, `name`, `type`, `required`, `min_select`, `max_select`, `sort_order`) VALUES
(1, '双拼', 3, 0, 2, 2, 1);
SET @g = LAST_INSERT_ID();
INSERT INTO `dish_spec_option` (`group_id`, `dish_id`, `name`, `sort_order`) VALUES
(@g, 2, '烧鸭', 1), (@g, 3, '叉烧', 2), (@g, 4, '鹅肾', 3), (@g, 7, '蛋炒饭', 4);

-- 招牌烧鸭饭(2)：双拼 可选（2选2）
INSERT INTO `dish_spec_group` (`dish_id`, `name`, `type`, `required`, `min_select`, `max_select`, `sort_order`) VALUES
(2, '双拼', 3, 0, 2, 2, 1);
SET @g = LAST_INSERT_ID();
INSERT INTO `dish_spec_option` (`group_id`, `dish_id`, `name`, `sort_order`) VALUES
(@g, 1, '烧鹅', 1), (@g, 3, '叉烧', 2), (@g, 4, '鹅肾', 3), (@g, 7, '蛋炒饭', 4);

-- 米饭(5)：份量 单选可选（大碗加价2元）
INSERT INTO `dish_spec_group` (`dish_id`, `name`, `type`, `required`, `min_select`, `max_select`, `sort_order`) VALUES
(5, '份量', 1, 0, 1, 1, 1);
SET @g = LAST_INSERT_ID();
INSERT INTO `dish_spec_option` (`group_id`, `name`, `price_delta`, `sort_order`) VALUES
(@g, '中碗', 0.00, 1), (@g, '大碗', 2.00, 2);

-- 冰红茶(6)：温度（常温/冰饮）单选必选
INSERT INTO `dish_spec_group` (`dish_id`, `name`, `type`, `required`, `min_select`, `max_select`, `sort_order`) VALUES
(6, '温度', 1, 1, 1, 1, 1);
SET @g = LAST_INSERT_ID();
INSERT INTO `dish_spec_option` (`group_id`, `name`, `sort_order`) VALUES
(@g, '常温', 1), (@g, '冰饮', 2);

-- 维他奶(11)：温度（常温/冰饮）单选必选
INSERT INTO `dish_spec_group` (`dish_id`, `name`, `type`, `required`, `min_select`, `max_select`, `sort_order`) VALUES
(11, '温度', 1, 1, 1, 1, 1);
SET @g = LAST_INSERT_ID();
INSERT INTO `dish_spec_option` (`group_id`, `name`, `sort_order`) VALUES
(@g, '常温', 1), (@g, '冰饮', 2);
