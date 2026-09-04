-- ============================================================
-- 二维码点餐系统 - 数据库初始化脚本
-- 数据库：qr_ordering
-- 版本：v1.0（首期：顾客扫码点餐 + 后厨接单 + 商家管菜品）
-- 字符集：utf8mb4
-- ============================================================

CREATE DATABASE IF NOT EXISTS `qr_ordering`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_general_ci;

USE `qr_ordering`;

-- ------------------------------------------------------------
-- 1. 门店表：商家创建的门店信息
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `shop`;
CREATE TABLE `shop` (
  `id`           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '门店ID',
  `name`         VARCHAR(100)    NOT NULL                COMMENT '门店名称',
  `logo`         VARCHAR(500)    DEFAULT NULL            COMMENT '门店Logo图片URL',
  `phone`        VARCHAR(20)     DEFAULT NULL            COMMENT '联系电话',
  `address`      VARCHAR(255)    DEFAULT NULL            COMMENT '门店地址',
  `open_time`    VARCHAR(50)     DEFAULT NULL            COMMENT '营业时间，如 09:00-22:00',
  `notice`       VARCHAR(255)    DEFAULT NULL            COMMENT '门店公告',
  `status`       TINYINT         NOT NULL DEFAULT 1      COMMENT '状态：1营业中 0已停业',
  `create_time`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COMMENT='门店表';

-- ------------------------------------------------------------
-- 2. 桌台表：每张餐桌绑定一个二维码标识
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `dining_table`;
CREATE TABLE `dining_table` (
  `id`           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '桌台ID',
  `shop_id`      BIGINT UNSIGNED NOT NULL                COMMENT '所属门店ID',
  `table_no`     VARCHAR(20)     NOT NULL                COMMENT '桌号，如 A01 / 2-3',
  `qr_code`      VARCHAR(64)     NOT NULL                COMMENT '二维码标识（唯一，用于生成桌码）',
  `seat_count`   INT             NOT NULL DEFAULT 4      COMMENT '可坐人数',
  `status`       TINYINT         NOT NULL DEFAULT 1      COMMENT '状态：1空闲 2用餐中 0停用',
  `create_time`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_qr_code` (`qr_code`),
  KEY `idx_shop_id` (`shop_id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COMMENT='桌台表';

-- ------------------------------------------------------------
-- 3. 菜品分类表
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `category`;
CREATE TABLE `category` (
  `id`           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '分类ID',
  `shop_id`      BIGINT UNSIGNED NOT NULL                COMMENT '所属门店ID',
  `name`         VARCHAR(50)     NOT NULL                COMMENT '分类名称，如 招牌菜/主食/饮品',
  `sort_order`   INT             NOT NULL DEFAULT 0      COMMENT '排序值，越小越靠前',
  `status`       TINYINT         NOT NULL DEFAULT 1      COMMENT '状态：1启用 0停用',
  `create_time`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_shop_id` (`shop_id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COMMENT='菜品分类表';

-- ------------------------------------------------------------
-- 4. 菜品表
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `dish`;
CREATE TABLE `dish` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '菜品ID',
  `shop_id`       BIGINT UNSIGNED NOT NULL                COMMENT '所属门店ID',
  `category_id`   BIGINT UNSIGNED NOT NULL                COMMENT '所属分类ID',
  `name`          VARCHAR(100)    NOT NULL                COMMENT '菜品名称',
  `description`   VARCHAR(500)    DEFAULT NULL            COMMENT '菜品描述',
  `image`         VARCHAR(500)    DEFAULT NULL            COMMENT '菜品图片URL',
  `price`         DECIMAL(10,2)   NOT NULL                COMMENT '价格（元）',
  `stock`         INT             NOT NULL DEFAULT 0      COMMENT '库存，0表示不限量',
  `sold_count`    INT             NOT NULL DEFAULT 0      COMMENT '累计销量',
  `is_recommend`  TINYINT         NOT NULL DEFAULT 0      COMMENT '是否推荐：1推荐 0普通',
  `status`        TINYINT         NOT NULL DEFAULT 1      COMMENT '状态：1上架 0下架',
  `create_time`   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time`   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_shop_category` (`shop_id`, `category_id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COMMENT='菜品表';

-- ------------------------------------------------------------
-- 4.1 菜品规格组表：一个菜品可配置多个规格组（如 辣度/双拼/份量）
--     type：1单选 2多选 3双拼（双拼=从候选里选2个拼一份）
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
-- 4.2 菜品规格选项表：规格组下的可选选项（可加价、可关联菜品用于双拼）
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
-- 5. 用户表（顾客，扫码点餐）
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `user`;
CREATE TABLE `user` (
  `id`           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '用户ID',
  `openid`       VARCHAR(64)     DEFAULT NULL            COMMENT '微信openid（登录凭证）',
  `nickname`     VARCHAR(50)     DEFAULT NULL            COMMENT '昵称',
  `avatar`       VARCHAR(500)    DEFAULT NULL            COMMENT '头像URL',
  `phone`        VARCHAR(20)     DEFAULT NULL            COMMENT '手机号',
  `status`       TINYINT         NOT NULL DEFAULT 1      COMMENT '状态：1正常 0禁用',
  `create_time`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '注册时间',
  `update_time`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_openid` (`openid`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

-- ------------------------------------------------------------
-- 6. 订单表（主表，一笔订单对应一次桌台点餐）
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `orders`;
CREATE TABLE `orders` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '订单ID',
  `order_no`      VARCHAR(32)     NOT NULL                COMMENT '订单编号（业务唯一）',
  `shop_id`       BIGINT UNSIGNED NOT NULL                COMMENT '门店ID',
  `table_id`      BIGINT UNSIGNED NOT NULL                COMMENT '桌台ID',
  `user_id`       BIGINT UNSIGNED DEFAULT NULL            COMMENT '下单用户ID（可空，扫码即点可不注册）',
  `total_amount`  DECIMAL(10,2)   NOT NULL                COMMENT '订单总金额（元）',
  `status`        TINYINT         NOT NULL DEFAULT 0      COMMENT '状态：0待支付 1已支付待制作 2制作中 3已上菜 4已完成 5已取消 6已退款',
  `remark`        VARCHAR(255)    DEFAULT NULL            COMMENT '顾客备注',
  `pay_time`      DATETIME        DEFAULT NULL            COMMENT '支付时间',
  `finish_time`   DATETIME        DEFAULT NULL            COMMENT '完成时间',
  `create_time`   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '下单时间',
  `update_time`   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_order_no` (`order_no`),
  KEY `idx_shop_status` (`shop_id`, `status`),
  KEY `idx_table` (`table_id`),
  KEY `idx_user` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COMMENT='订单表';

-- ------------------------------------------------------------
-- 7. 订单明细表（一份订单包含多道菜）
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `order_item`;
CREATE TABLE `order_item` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '明细ID',
  `order_id`      BIGINT UNSIGNED NOT NULL                COMMENT '订单ID',
  `dish_id`       BIGINT UNSIGNED NOT NULL                COMMENT '菜品ID',
  `dish_name`     VARCHAR(100)    NOT NULL                COMMENT '菜品名称快照（下单时复制）',
  `dish_image`    VARCHAR(500)    DEFAULT NULL            COMMENT '菜品图片快照',
  `price`         DECIMAL(10,2)   NOT NULL                COMMENT '下单单价（元，含规格加价）',
  `spec_text`     VARCHAR(500)    DEFAULT NULL            COMMENT '规格快照，如 辣度:微辣；双拼:烧鸭+叉烧',
  `quantity`      INT             NOT NULL DEFAULT 1      COMMENT '数量',
  `subtotal`      DECIMAL(10,2)   NOT NULL                COMMENT '小计金额（元）',
  `status`        TINYINT         NOT NULL DEFAULT 0      COMMENT '制作状态：0待制作 1制作中 2已出餐 3已退菜',
  `create_time`   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time`   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_order` (`order_id`),
  KEY `idx_dish` (`dish_id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COMMENT='订单明细表';

-- ------------------------------------------------------------
-- 8. 支付记录表（首期对接微信支付，先留结构）
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `payment`;
CREATE TABLE `payment` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '支付记录ID',
  `order_id`      BIGINT UNSIGNED NOT NULL                COMMENT '订单ID',
  `pay_no`        VARCHAR(64)     NOT NULL                COMMENT '支付流水号',
  `channel`       VARCHAR(20)     NOT NULL DEFAULT 'WECHAT' COMMENT '支付渠道：WECHAT微信支付 / MOCK模拟',
  `amount`        DECIMAL(10,2)   NOT NULL                COMMENT '支付金额（元）',
  `status`        TINYINT         NOT NULL DEFAULT 0      COMMENT '状态：0待支付 1支付成功 2支付失败 3已退款',
  `transaction_id` VARCHAR(64)    DEFAULT NULL            COMMENT '微信支付交易号',
  `pay_time`      DATETIME        DEFAULT NULL            COMMENT '支付完成时间',
  `create_time`   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time`   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_pay_no` (`pay_no`),
  KEY `idx_order` (`order_id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COMMENT='支付记录表';

-- ============================================================
-- 初始化示例数据（便于联调）
-- ============================================================

-- 示例门店
INSERT INTO `shop` (`id`, `name`, `phone`, `address`, `open_time`, `notice`) VALUES
(1, '测试湘菜馆', '13800000000', '东莞市南城区测试路 1 号', '10:00-22:00', '欢迎光临，扫码点餐更方便');

-- 示例桌台
INSERT INTO `dining_table` (`shop_id`, `table_no`, `qr_code`, `seat_count`) VALUES
(1, 'A01', 'T001', 4),
(1, 'A02', 'T002', 4),
(1, 'A03', 'T003', 6),
(1, 'B01', 'T004', 2);

-- 示例分类
INSERT INTO `category` (`shop_id`, `name`, `sort_order`) VALUES
(1, '招牌菜', 1),
(1, '家常菜', 2),
(1, '主食', 3),
(1, '饮品', 4);

-- 示例菜品
INSERT INTO `dish` (`shop_id`, `category_id`, `name`, `description`, `price`, `stock`, `is_recommend`) VALUES
(1, 1, '剁椒鱼头', '招牌辣味，鲜嫩入味', 68.00, 0, 1),
(1, 1, '毛氏红烧肉', '肥而不腻，入口即化', 58.00, 0, 1),
(1, 2, '辣椒炒肉', '湖南经典家常菜', 38.00, 0, 0),
(1, 2, '清炒时蔬', '当季新鲜蔬菜', 22.00, 0, 0),
(1, 3, '米饭', '东北大米', 3.00, 0, 0),
(1, 4, '冰红茶', '冰爽解腻', 6.00, 0, 0);

-- ============================================================
-- 示例规格数据（选规格 + 双拼 演示）
-- 规格组 type：1单选 2多选 3双拼；required：1必选 0可选
-- ============================================================

-- 毛氏红烧肉(2)：双拼 可选（2选2），可拼 红烧肉/红烧排骨/香干/卤蛋
INSERT INTO `dish_spec_group` (`id`, `dish_id`, `name`, `type`, `required`, `min_select`, `max_select`, `sort_order`) VALUES
(2, 2, '双拼', 3, 0, 2, 2, 1);
INSERT INTO `dish_spec_option` (`group_id`, `name`, `sort_order`) VALUES
(2, '红烧肉', 1), (2, '红烧排骨', 2), (2, '香干', 3), (2, '卤蛋', 4);

-- 米饭(5)：份量 单选可选（大碗加价2元）
INSERT INTO `dish_spec_group` (`id`, `dish_id`, `name`, `type`, `required`, `min_select`, `max_select`, `sort_order`) VALUES
(4, 5, '份量', 1, 0, 1, 1, 1);
INSERT INTO `dish_spec_option` (`group_id`, `name`, `price_delta`, `sort_order`) VALUES
(4, '中碗', 0.00, 1), (4, '大碗', 2.00, 2);

-- 冰红茶(6)：温度（常温/冰饮）单选必选
INSERT INTO `dish_spec_group` (`id`, `dish_id`, `name`, `type`, `required`, `min_select`, `max_select`, `sort_order`) VALUES
(5, 6, '温度', 1, 1, 1, 1, 1);
INSERT INTO `dish_spec_option` (`group_id`, `name`, `sort_order`) VALUES
(5, '常温', 1), (5, '冰饮', 2);
