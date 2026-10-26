# 禧粤美食 AI 功能搭建与迭代总结

> 本文档总结了 2026-10-25 至 2026-10-26 期间，为「禧粤美食」二维码点餐系统搭建 AI 功能的完整思路、技术方案、迭代过程和优化方向。

---

## 目录

1. [整体架构概览](#1-整体架构概览)
2. [第1层：AI 菜品推荐](#2-第1层ai-菜品推荐)
3. [第2层：智能客服 RAG](#3-第2层智能客服-rag)
4. [AI 功能开关管理](#4-ai-功能开关管理)
5. [飞书多维表格应用搭建](#5-飞书多维表格应用搭建)
6. [审批流设计思路](#6-审批流设计思路)
7. [知识库与 RAG 层级详解](#7-知识库与-rag-层级详解)
8. [后续优化路线](#8-后续优化路线)

---

## 1. 整体架构概览

### 1.1 技术栈

| 层级 | 技术 | 说明 |
|---|---|---|
| 后端 | Spring Boot 3.0 + Java 17 | 原有 xyms 项目 |
| 数据库 | MySQL 8.0 | 原有 qr_ordering 库 |
| AI 调用 | 火山引擎方舟平台 | 接入点 ep-20261025181755-qvj6z |
| 前端 | 微信小程序 | 原有 miniprogram 目录 |
| 部署 | cpolar 内网穿透 | 本地开发测试用 |

### 1.2 AI 功能三层架构

```
┌─────────────────────────────────┐
│ 第3层：经营数据问答（Agent）    │  ← 规划中
├─────────────────────────────────┤
│ 第2层：智能客服问答（RAG）      │  ← 已完成
├─────────────────────────────────┤
│ 第1层：AI 菜品推荐（Prompt）    │  ← 已完成
├─────────────────────────────────┤
│ 现有系统底座                    │  ← 已有
│ Spring Boot + MySQL + 小程序    │
└─────────────────────────────────┘
```

### 1.3 设计原则

- **可插拔**：AI 功能是外挂，不是核心链路，关掉不影响点餐
- **可开关**：管理员可在后台界面控制开关，不用改代码重启
- **复用现有**：在原有 xyms 项目里新建 `ai` 包，不拆新项目
- **故障兜底**：AI 接口挂了，用户仍能正常点菜

---

## 2. 第1层：AI 菜品推荐

### 2.1 创建背景

顾客扫码进入点餐页，面对一堆菜单不知道点什么。希望 AI 能根据顾客的口味偏好，自动推荐几道菜品。

### 2.2 技术方案

**核心流程：**
```
顾客输入口味偏好（如"我想吃清淡的"）
    ↓
后端查数据库里的上架菜品
    ↓
把菜单列表 + 顾客偏好拼成一段 Prompt
    ↓
调火山引擎豆包大模型 API
    ↓
AI 返回推荐的菜名
    ↓
后端匹配回数据库里的菜品对象
    ↓
返回给前端展示
```

### 2.3 文件结构

```
com/ordering/ai/
├── config/
│   └── AiProperties.java          # AI 配置类（开关、API Key、模型）
├── controller/
│   ├── AiController.java          # 推荐接口 POST /api/ai/recommend
│   ├── AiChatController.java      # 客服接口 POST /api/ai/chat
│   └── AiConfigController.java    # 管理员开关接口
├── service/
│   ├── AiRecommendService.java    # 推荐核心逻辑
│   ├── AiChatService.java         # 客服核心逻辑
│   └── AiConfigService.java       # 开关配置服务
├── entity/
│   ├── AiQa.java                  # FAQ 实体
│   └── AiConfig.java              # 配置实体
└── mapper/
    ├── AiQaMapper.java
    └── AiConfigMapper.java
```

### 2.4 配置项

`application.yml` 中的 AI 配置：

```yaml
ai:
  enabled: true                          # AI 功能总开关
  api-key: ark-xxxxxxxx-xxxx-xxxx        # 火山引擎 API Key
  api-url: https://ark.cn-beijing.volces.com/api/v3/chat/completions
  model: ep-20261025181755-qvj6z        # 接入点 ID
  recommend-categories: 主食,汤粉,汤饭,例汤  # 只从这些分类推荐
```

### 2.5 迭代过程

#### 第一版：基础推荐
- 输入口味偏好 → 返回3道推荐菜
- 问题：每次推荐的菜都差不多

#### 第二版：换一批功能
- 新增 `excludeIds` 参数：把已推荐过的菜品 ID 传给后端
- 后端在 Prompt 里告诉 AI"选和之前不一样的"
- temperature 从 0.7 提到 0.9，增加随机性
- 前端："换一换"按钮 + "重新输入"按钮，无次数限制

#### 第三版：分类过滤
- 新增 `recommend-categories` 配置项
- 后端先查分类名称对应的分类 ID，再只从这些分类下的菜品推荐
- 避免推荐出饮品、加菜、例牌里的东西

#### 第四版：Loading 状态
- 点击后按钮变成"AI思考中…"，禁止重复点击
- 解决用户以为"点了没反应"的问题

### 2.6 前端交互

- **入口位置**：点餐页搜索栏下方，蓝色横幅"🤖 不知道吃什么？AI帮你推荐"
- **弹窗形式**：底部弹出，输入口味偏好 → 展示推荐结果
- **交互**：点"选它"直接打开规格选择弹窗，加入购物车

---

## 3. 第2层：智能客服 RAG

### 3.1 创建背景

顾客经常问一些重复问题：几点开门？有没有不辣的菜？可以打包吗？希望有个智能客服自动回答，不用人工值守。

### 3.2 技术方案

**核心流程：**
```
顾客在"我的"页面点"智能客服"
    ↓
输入问题（如"你们几点关门？"）
    ↓
后端查 ai_qa 表里的门店 FAQ 知识库
    ↓
把所有 FAQ 拼进 Prompt：
    "你是烧腊店客服，以下是知识库：
     Q1：xxx A1：xxx
     Q2：xxx A2：xxx
     顾客问：几点关门？
     请根据知识库回答，知识库没有就说转人工"
    ↓
调豆包大模型 API
    ↓
AI 根据知识库内容生成回答
    ↓
返回给前端聊天窗口展示
```

### 3.3 数据库设计

```sql
CREATE TABLE ai_qa (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  shop_id BIGINT NOT NULL COMMENT '门店ID',
  question VARCHAR(255) NOT NULL COMMENT '问题',
  answer TEXT NOT NULL COMMENT '答案',
  status INT DEFAULT 1 COMMENT '状态：1启用 0停用',
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

**初始 FAQ 数据：**
| 问题 | 答案 |
|---|---|
| 你们几点开门？ | 上午10点到晚上10点，全年无休 |
| 有没有不辣的菜？ | 白切鸡、烧鸭饭、叉烧饭都是不辣的 |
| 可以打包吗？ | 可以，所有菜品都可以打包，打包费免费 |
| 支持外卖吗？ | 暂时只支持到店自取，不做外卖配送 |

### 3.4 前端交互

- **入口位置**："我的"页面，和"切换桌台"一样是列表项
- **弹窗形式**：全屏聊天界面，类似微信对话
- **消息样式**：AI 消息左对齐白色气泡，用户消息右对齐橙色气泡
- **功能**：底部输入框 + 发送按钮，支持回车发送

### 3.5 迭代过程

#### 第一版：悬浮按钮
- 在点餐页右下角加悬浮客服按钮
- 问题：悬浮按钮遮挡点餐内容，用户体验不好

#### 第二版：移到"我的"页面
- 把客服入口从点餐页移到"我的"页面
- 做成列表项形式，和"切换桌台"并列
- 点餐页保持干净

#### 第三版：UI 样式调整
- 修复消息气泡超出屏幕被截断的问题
- 修复输入框被底部导航栏遮挡的问题
- 调整气泡最大宽度为 75%，左右留白

---

## 4. AI 功能开关管理

### 4.1 创建背景

最初开关是写在 `application.yml` 里的，改一次要重启后端，管理员没法自己控制。需要做成后台可配置的。

### 4.2 数据库设计

```sql
CREATE TABLE ai_config (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  shop_id BIGINT NOT NULL,
  config_key VARCHAR(50) NOT NULL COMMENT '配置项 key',
  config_value VARCHAR(100) NOT NULL COMMENT '配置值',
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

**配置项：**
| key | value | 说明 |
|---|---|---|
| ai_recommend_enabled | true/false | AI 菜品推荐开关 |
| ai_chat_enabled | true/false | 智能客服开关 |

### 4.3 管理员后台

- **入口**：商家管理后台 → 🤖 AI设置
- **界面**：两个开关，切换即保存
- **效果**：关闭后顾客端对应功能不可用，**无需重启后端**

### 4.4 实现原理

- 后端每个 AI 接口调用前，先查 `ai_config` 表判断开关
- 如果关了，直接返回"功能已关闭"
- 配置存在数据库里，改了立即生效

---

## 5. 飞书多维表格应用搭建

### 5.1 配置信息

`application.yml` 中的飞书配置：

```yaml
feishu:
  app-id: cli_aa570eccc0b89d29
  app-secret: your-feishu-app-secret-here
  base-token: XXsubCqCzaKiVbsDOOLcAirRn8c
```

### 5.2 应用场景

- **运营看板**：订单数据、销量统计同步到多维表格
- **库存管理**：菜品库存变动实时同步
- **每日报表**：每日营收自动汇总到表格

### 5.3 搭建步骤

1. **创建飞书自建应用**：在飞书开放平台创建应用，获取 app-id 和 app-secret
2. **开通权限**：开通多维表格读写权限
3. **创建多维表格**：在飞书里建好多维表格，获取 base-token
4. **后端集成**：用 app-id + app-secret 获取 tenant_access_token，再调多维表格 API
5. **数据同步**：业务数据变动时，同步写入多维表格

---

## 6. 审批流设计思路

### 6.1 适用场景

- **退款审批**：顾客申请退款，店长审批
- **菜品上新审批**：运营提报新菜品，店长审核后上架
- **管理员添加审批**：添加新管理员需要上级审批

### 6.2 技术方案

**方案一：飞书审批（推荐）**
- 在飞书审批后台设计审批流程
- 后端调用飞书审批 API，创建审批实例
- 审批结果通过回调通知后端

**方案二：自建审批**
- 数据库建审批表：审批单、审批节点、审批记录
- 小程序里做审批列表和审批操作
- 状态流转：待审批 → 通过/拒绝

### 6.3 流程设计示例（退款审批）

```
顾客申请退款
    ↓
系统自动创建审批单
    ↓
通知店长（飞书消息推送）
    ↓
店长审批：通过 / 拒绝
    ↓
通过：后端执行退款，订单状态改为已退款
    拒绝：通知顾客，说明原因
```

---

## 7. 知识库与 RAG 层级详解

### 7.1 什么是 RAG

RAG = Retrieval-Augmented Generation，检索增强生成。

简单说就是：**先查资料，再回答问题**。

```
用户提问 → 检索相关知识 → 把知识+问题一起给AI → AI基于知识回答
```

### 7.2 RAG 的完整层级

```
┌─────────────────────────────────┐
│ 第4层：多轮对话 + 工具调用（Agent）│  ← 未来规划
├─────────────────────────────────┤
│ 第3层：向量检索 RAG             │  ← 完整版
│ 文档切分 → Embedding → 向量数据库 │
│ → 相似度检索 → 生成回答          │
├─────────────────────────────────┤
│ 第2层：上下文增强（简化版RAG）   │  ← 当前实现
│ 全量知识库 → 拼进 Prompt → 生成  │
├─────────────────────────────────┤
│ 第1层：纯 Prompt 工程           │  ← AI推荐
│ 菜单+偏好 → Prompt → 生成推荐     │
└─────────────────────────────────┘
```

### 7.3 当前实现程度

**现在做的是第2层：简化版 RAG（上下文增强）**

| 环节 | 现在的做法 | 完整版 RAG 应该是 |
|---|---|---|
| 知识库存储 | MySQL ai_qa 表 | 向量数据库（Chroma/Milvus） |
| 知识处理 | 没做，全量拼进 Prompt | 文档切分 + Embedding 向量化 |
| 检索 | 没做，所有 FAQ 都给 AI | 向量相似度检索，只取最相关的几条 |
| 生成 | 调豆包 API 回答 | 一样 |

### 7.4 为什么现在这样做够用

- 小餐饮店 FAQ 数量少（十几条顶天了）
- 全量塞给 AI 完全能处理，效果和完整版 RAG 差别不大
- 学生项目、简历上写"集成大模型API实现智能客服"完全够用
- 不用引入向量数据库，减少技术复杂度

### 7.5 完整版 RAG 的搭建步骤

如果要升级到完整版 RAG：

1. **引入 Embedding 模型**：把每条 FAQ 转成向量
2. **向量数据库**：用 Chroma（轻量级）或 Milvus
3. **检索逻辑**：用户问题也做 Embedding，算余弦相似度，取最相关的 3 条
4. **拼接 Prompt**：只把检索到的 3 条知识 + 用户问题给 AI
5. **效果**：FAQ 再多也不会卡，响应更快，回答更精准

---

## 8. 后续优化路线

### 8.1 短期（1周内）

- [ ] **知识库管理后台**：管理员在小程序里增删改 FAQ，不用直接改数据库
- [ ] **多轮对话记忆**：AI 能记住之前聊了什么，支持上下文追问
- [ ] **结合菜单回答**：不光查 FAQ，还能结合菜品菜单回答（如"有什么不辣的菜"）

### 8.2 中期（2-3周）

- [ ] **完整版 RAG**：引入向量数据库，做真正的语义检索
- [ ] **第3层：经营数据问答**：老板问"今天卖了多少钱"，AI 自动查 MySQL 回答
- [ ] **飞书审批流**：退款审批、上新审批接入飞书审批

### 8.3 长期

- [ ] **用户画像**：根据历史点餐记录，个性化推荐
- [ ] **语音点餐**：接入语音识别，顾客说话就能点菜
- [ ] **评价分析**：自动分析顾客评价，生成改进建议

---

## 附录：关键文件清单

### 后端（xyms/src/main/java/com/ordering/ai/）

| 文件 | 作用 |
|---|---|
| config/AiProperties.java | AI 配置类 |
| controller/AiController.java | 菜品推荐接口 |
| controller/AiChatController.java | 智能客服接口 |
| controller/AiConfigController.java | 管理员开关接口 |
| service/AiRecommendService.java | 推荐核心逻辑 |
| service/AiChatService.java | 客服核心逻辑 |
| service/AiConfigService.java | 开关配置服务 |
| entity/AiQa.java | FAQ 实体 |
| entity/AiConfig.java | 配置实体 |
| mapper/AiQaMapper.java | FAQ Mapper |
| mapper/AiConfigMapper.java | 配置 Mapper |

### 前端（miniprogram/）

| 文件 | 改动 |
|---|---|
| utils/request.js | 加 AI 相关 API 方法 |
| pages/menu/menu.wxml | 加 AI 推荐横幅和弹窗 |
| pages/menu/menu.wxss | 推荐弹窗样式 |
| pages/menu/menu.js | 推荐逻辑 |
| pages/profile/profile.wxml | 加智能客服入口和聊天弹窗 |
| pages/profile/profile.wxss | 聊天界面样式 |
| pages/profile/profile.js | 客服聊天逻辑 |
| pages/admin/ai-settings/ | AI 设置页面（开关管理） |

### 数据库表

| 表名 | 作用 |
|---|---|
| ai_qa | FAQ 知识库 |
| ai_config | AI 功能开关配置 |

---

**文档生成时间：** 2026-10-26
**项目：** 禧粤美食二维码点餐系统
