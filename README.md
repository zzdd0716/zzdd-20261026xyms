# 二维码点餐系统（xyms）

真实开店场景 · 首期范围：**顾客扫码点餐 + 后厨接单 + 商家管菜品**

## 技术栈
- Java 17 / Spring Boot 3.0.2 / MyBatis-Plus 3.5.7 / MySQL 8.0
- 构建：Maven（IDEA 内置 Maven 3.8.1）

## 项目结构
```
xyms/
├── pom.xml                 # Maven 工程配置
├── sql/
│   └── init.sql            # 建库建表脚本 + 示例数据
└── src/
    ├── main/
    │   ├── java/com/ordering/
    │   │   ├── controller/    # 接口层（顾客端/后厨端/商家端）
    │   │   ├── service/       # 业务层
    │   │   ├── mapper/        # MyBatis-Plus 数据访问
    │   │   ├── entity/        # 实体（8 张表）
    │   │   ├── dto/           # 传输对象
    │   │   ├── common/        # 通用返回结果
    │   │   ├── config/        # 全局异常处理等
    │   │   └── QrOrderingApplication.java  # 启动类
    │   └── resources/
    │       └── application.yml # 配置（端口 8080、MySQL 连接）
    └── test/
```

## 快速开始（IDEA）
1. **建库**：用 Navicat 或命令行执行 `sql/init.sql`（库名 `qr_ordering`，含示例数据）。
2. **打开工程**：IDEA → File → Open → 选择本目录（`E:\2026shixun\xyms`），等待 Maven 导入完成。
3. **配置 JDK**：File → Project Structure → Project SDK 选择 JDK 17。
4. **运行**：找到 `com.ordering.QrOrderingApplication`，右键 Run。
5. **验证**：浏览器访问 `http://localhost:8080/api/menu/dishes?shopId=1`，返回菜品 JSON 即成功。

> 数据库连接默认使用 root / 79365920，可在 `application.yml` 中修改，或用环境变量 `DB_PASSWORD` 覆盖。

## 已实现接口（首期）
| 模块 | 接口 | 说明 |
|---|---|---|
| 顾客点餐 | `GET /api/menu/categories?shopId=` | 查询分类 |
| 顾客点餐 | `GET /api/menu/dishes?shopId=&categoryId=` | 查询菜品 |
| 顾客点餐 | `POST /api/order/create` | 下单（含明细、金额后端校验） |
| 后厨接单 | `GET /api/order/list?status=` | 按状态查订单 |
| 后厨接单 | `GET /api/order/detail/{orderId}` | 订单详情 |
| 后厨接单 | `PUT /api/order/status/{orderId}?status=` | 更新订单状态 |
| 后厨接单 | `PUT /api/order/item/status/{itemId}?status=` | 更新明细状态 |
| 商家管理 | `GET/POST /api/admin/category`、`DELETE /api/admin/category/{id}` | 分类增删查 |
| 商家管理 | `GET/POST /api/admin/dish`、`DELETE /api/admin/dish/{id}` | 菜品增删查（菜品可配置规格组+选项，含双拼） |
| 商家管理 | `GET/POST /api/admin/table`、`DELETE /api/admin/table/{id}` | 桌台码增删查 |
| 顾客点餐 | `GET /api/menu/dishes?shopId=&categoryId=` | 菜品列表附带规格组与选项（选规格/双拼） |
| 订单 | `GET /api/order/items/{orderId}` | 订单明细（含规格快照，后厨查看） |

> 订单状态约定：0待支付 1已支付待制作 2制作中 3已上菜 4已完成 5已取消 6已退款

## 选规格 + 双拼（本期新增）

顾客点菜时，菜单上不再显示 `+/-` 按钮，每个菜品统一通过「选规格」按钮进入规格弹窗；弹窗内可选择规格（单选/多选/双拼）并选择**份数**，确认后按「菜品+规格」加入购物车并计算加价，下单时规格快照（如 `辣度:微辣；双拼:烧鸭+叉烧`）随订单落库，后厨在订单详情可见。购物车页内仍可对每条已选菜调整数量。

- **规格组（dish_spec_group）**：一个菜品可配多个规格组，类型分为
  - `1 单选`（如 温度：常温/冰饮，饮品选冷热）
  - `2 多选`（如 加料：加蛋/加火腿/加虾仁，可选多项）
  - `3 双拼`（从候选中选 2 项拼一份，如 烧鸭+叉烧）
  - 每个规格组可设：是否必选、最少/最多选择数、排序
- **规格选项（dish_spec_option）**：选项名称、加价（如 大碗 +2.00）、双拼可关联到具体菜品
- **下单校验**：后端按规格组校验必选与最少/最多选择数，金额 = 菜品价 + 规格加价，前端价格仅作展示
- **条目备注**：加入购物车时可为单道菜填写备注（如 少盐、常温去冰），随规格快照一同落库到 `order_item.remark`，后厨在订单详情可见；升级脚本 `sql/upgrade_item_remark.sql`（给 order_item 加 remark 列）
- **升级脚本**：已建库的环境执行 `sql/upgrade_spec.sql`（新建规格表 + order_item 加 spec_text + 示例规格数据）
