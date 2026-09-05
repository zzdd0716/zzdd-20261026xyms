# 二维码点餐系统（xyms）

真实开店场景 · 首期范围：**顾客扫码点餐 + 后厨接单 + 商家管菜品**（H5 网页版 + **微信小程序版**）

## 技术栈
- Java 17 / Spring Boot 3.0.2 / MyBatis-Plus 3.5.7 / MySQL 8.0
- 构建：Maven（IDEA 内置 Maven 3.8.1）
- 小程序：原生微信小程序（WXML/WXSS/JS），微信开发者工具打开即可运行

## 项目结构
```
xyms/
├── pom.xml                 # Maven 工程配置
├── project.config.json     # 微信开发者工具根配置（miniprogramRoot 指向 miniprogram/）
├── miniprogram/            # ★ 微信小程序端（顾客点餐 + 商家/后厨后台）
│   ├── app.js / app.json / app.wxss
│   ├── utils/              # config.js（接口地址）/ request.js（API 封装）/ util.js
│   ├── components/spec-dialog/  # 选规格弹窗组件（单选/多选/双拼）
│   └── pages/
│       ├── index/          # 首页：选择桌台（模拟扫码进店）
│       ├── menu/           # 顾客点餐（分类+菜品+选规格）
│       ├── cart/           # 购物车（备注/调数量/提交订单）
│       ├── orders/         # 我的订单（按用户过滤）
│       ├── order-detail/   # 订单详情（顾客）
│       ├── profile/        # 我的（切换桌台 + 商家后台入口）
│       └── admin/          # 商家/后厨：工作台/接单/订单详情/菜品/菜品编辑/分类/桌台/收银统计
├── sql/
│   └── init.sql            # 建库建表脚本 + 示例数据
└── src/
    ├── main/
    │   ├── java/com/ordering/
    │   │   ├── controller/    # 接口层（顾客端/后厨端/商家端/用户）
    │   │   ├── service/       # 业务层
    │   │   ├── mapper/        # MyBatis-Plus 数据访问
    │   │   ├── entity/        # 实体（8 张表）
    │   │   ├── dto/           # 传输对象
    │   │   ├── common/        # 通用返回结果
    │   │   ├── config/        # 全局异常处理等
    │   │   └── QrOrderingApplication.java  # 启动类
    │   └── resources/
    │       ├── application.yml # 配置（端口 8080、MySQL 连接）
    │       └── static/         # H5 网页版（/admin 商家后台、/customer 顾客端）
    └── test/
```

## 快速开始（IDEA）
1. **建库**：用 Navicat 或命令行执行 `sql/init.sql`（库名 `qr_ordering`，含示例数据）。
2. **打开工程**：IDEA → File → Open → 选择本目录（`E:\2026shixun\xyms`），等待 Maven 导入完成。
3. **配置 JDK**：File → Project Structure → Project SDK 选择 JDK 17。
4. **运行**：找到 `com.ordering.QrOrderingApplication`，右键 Run。
5. **验证**：浏览器访问 `http://localhost:8080/api/menu/dishes?shopId=1`，返回菜品 JSON 即成功。

> 数据库连接默认使用 root / 79365920，可在 `application.yml` 中修改，或用环境变量 `DB_PASSWORD` 覆盖。

## 微信小程序端（miniprogram/）

顾客点餐、商家/后厨后台都已小程序化，原生实现，无需 npm 依赖。

### 运行步骤
1. **启动后端**：按上面「快速开始」跑起 Spring Boot（`http://localhost:8080`）。
2. **打开小程序**：微信开发者工具 → 导入项目 → 目录选择 **`E:\2026shixun\xyms\miniprogram`**（AppID 已配置，也可换成你自己的；工具设置里已关闭「校验合法域名」以支持本地 http 联调）。
3. **编译运行**：模拟器中打开首页选择桌台 → 进入点餐。如需真机预览，把 `miniprogram/utils/config.js` 的 `BASE_URL` 改为电脑局域网 IP（如 `http://192.168.1.100:8080`），并保证手机与电脑同一网络。

### 小程序功能清单
| 端 | 页面 | 功能 |
|---|---|---|
| 顾客 | index | 选择桌台（真实场景由桌台小程序码 scene 参数带入，自动进店） |
| 顾客 | menu | 分类导航 + 菜品列表 + 选规格弹窗（单选/多选/双拼、份数、备注） |
| 顾客 | cart | 购物车调数量/备注/移除 + 提交订单 |
| 顾客 | orders / order-detail | 我的订单（按用户过滤）+ 订单详情 |
| 顾客 | profile | 桌台切换 + 商家后台入口 |
| 商家 | admin/home | 工作台宫格导航 |
| 商家 | admin/kitchen | 接单列表：接单→制作→上菜→完成 一键流转 |
| 商家 | admin/order-detail | 订单明细 + 逐道菜制作状态（开始制作/已出餐/退菜） |
| 商家 | admin/dishes + dish-edit | 菜品管理：分类筛选、关键字搜索、价格排序、上下架、增删改、规格组配置 |
| 商家 | admin/clearance | 估清下架 / 重新上架：关键字命中菜品批量下架，自动停用关联规格项；重新上架可恢复菜品、分类与规格项 |
| 商家 | admin/categories | 分类增删改、启停 |
| 商家 | admin/tables | 桌台增删改 |
| 商家 | admin/stats | 收银统计：日/周/月/季入账汇总 + 销量占比饼图 + 销量排行 |

### 小程序身份说明
- 小程序首次启动会在本地生成唯一 openid，调用后端新增的 `POST /api/user/login` 自动注册并换取 `userId`；
- 下单时携带 `userId` 落库到 `orders.user_id`（表结构原有字段，无需改表），「我的订单」按 `userId` 过滤；
- 后端 `GET /api/order/list` 新增可选参数 `userId`（不传仍查全部，兼容原 H5 商家后台）。

### 小程序端与 H5 端差异
- 小程序端功能与网页版商家后台保持一致（含估清下架/重新上架）；
- 真实支付（微信支付）与正式发布域名（https）需在公众平台配置，当前联调直接下单即视为「已支付待制作」。

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

## 估清下架（本期新增）

菜品管理内新增「估清下架 / 重新上架」入口：下架模式下输入关键字搜索命中的菜品（如搜索“鸡”只显示白切鸡、烧鸡等含“鸡”的菜品），选中菜品后一键下架；同时自动停用其他菜品规格配置中关联到这些菜品的规格项。重新上架模式可按菜品或分类关键字找回已下架菜品，并恢复菜品所属分类和相关规格项。

商家编辑菜品时，规格组与规格选项现在都带有「启用/停用」开关，可用于手动下架某个规格组或选项。
