-- ============================================================
-- 二维码点餐系统 - 自提码功能配套脚本（可选）
-- 作用：给尚未配置「规格」组（堂食/打包）的菜品补上规格组，
--       使自提码模式（默认打包且不可更改）在所有菜品上生效。
-- 执行方式：mysql -uroot -p qr_ordering < upgrade_pickup_spec.sql
-- 说明：脚本可重复执行（幂等）。已配置过「规格」组的菜品不受影响。
-- ============================================================

USE `qr_ordering`;

-- 1) 为没有「规格」组的菜品补充规格组（type=1 单选，必选，最少/最多选1项，排最前）
INSERT INTO `dish_spec_group` (`dish_id`, `name`, `type`, `required`, `min_select`, `max_select`, `sort_order`, `status`)
SELECT d.id, '规格', 1, 1, 1, 1, 0, 1
FROM `dish` d
WHERE NOT EXISTS (
  SELECT 1 FROM `dish_spec_group` g WHERE g.dish_id = d.id AND g.name = '规格'
);

-- 2) 为「规格」组补充选项：堂食（默认）
INSERT INTO `dish_spec_option` (`group_id`, `dish_id`, `name`, `price_delta`, `sort_order`, `status`)
SELECT g.id, NULL, '堂食', 0.00, 1, 1
FROM `dish_spec_group` g
WHERE g.name = '规格'
  AND NOT EXISTS (SELECT 1 FROM `dish_spec_option` o WHERE o.group_id = g.id AND o.name = '堂食');

-- 3) 为「规格」组补充选项：打包（自提码模式默认选中并锁定）
INSERT INTO `dish_spec_option` (`group_id`, `dish_id`, `name`, `price_delta`, `sort_order`, `status`)
SELECT g.id, NULL, '打包', 0.00, 2, 1
FROM `dish_spec_group` g
WHERE g.name = '规格'
  AND NOT EXISTS (SELECT 1 FROM `dish_spec_option` o WHERE o.group_id = g.id AND o.name = '打包');
