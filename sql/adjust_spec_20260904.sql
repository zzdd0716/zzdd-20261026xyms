USE qr_ordering;

-- 1) 取消辣度规格组：叉烧饭辣度(gid3)及其选项；清理蛋炒饭辣度(gid8)的孤儿选项
DELETE FROM dish_spec_option WHERE group_id IN (3, 8);
DELETE FROM dish_spec_group WHERE id = 3;

-- 2) 冰红茶「温度」组调整为 常温/冰饮（原 加冰 → 冰饮，删除 去冰）
UPDATE dish_spec_option SET name = '冰饮' WHERE id = 40;
DELETE FROM dish_spec_option WHERE id = 41;

-- 3) 维他奶(dish11) 新增「温度」组：常温/冰饮（必选单选）
INSERT INTO dish_spec_group (dish_id, name, type, required, min_select, max_select, sort_order, status)
VALUES (11, '温度', 1, 1, 1, 1, 1, 1);
SET @g = LAST_INSERT_ID();
INSERT INTO dish_spec_option (group_id, dish_id, name, price_delta, sort_order, status)
VALUES (@g, NULL, '常温', 0.00, 1, 1),
       (@g, NULL, '冰饮', 0.00, 2, 1);
