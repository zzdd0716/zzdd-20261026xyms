# 禧粤美食项目从0到1搭建完整教程

> 包含：飞书多维表格 + AI菜品推荐 + 智能客服RAG + 知识库管理
> 日期：2026-10-26

---

## 目录

1. [整体架构概览](#一整体架构概览)
2. [飞书多维表格数据同步](#二飞书多维表格数据同步)
3. [AI菜品推荐](#三ai菜品推荐)
4. [智能客服RAG](#四智能客服rag)
5. [知识库管理后台](#五知识库管理后台)
6. [AI开关管理](#六ai开关管理)
7. [踩坑总结](#七踩坑总结)

---

## 一、整体架构概览

### 1.1 技术栈

| 层 | 技术 |
|---|---|
| 后端 | Spring Boot 3.0 + MyBatis-Plus + MySQL 8 |
| 前端 | 微信小程序（原生WXML/WXSS/JS） |
| AI | 火山引擎豆包大模型（接入点方式调用） |
| 数据同步 | 飞书开放平台多维表格API |
| 缓存 | Redis（后续会加） |

### 1.2 项目结构

```
src/main/java/com/ordering/
├── ai/                          # AI功能模块（我们新建的）
│   ├── config/                  # AI配置类
│   ├── controller/              # AI接口
│   ├── entity/                  # 数据库实体
│   ├── mapper/                  # 数据库操作
│   └── service/                 # AI业务逻辑
├── common/                      # 通用工具类
│   └── FeishuApiClient.java    # 飞书API工具类
├── task/                        # 定时任务
│   └── FeishuSyncTask.java      # 飞书数据同步任务
└── QrOrderingApplication.java  # 启动类
```

---

## 二、飞书多维表格数据同步

### 2.1 功能是什么

把你点餐系统里的菜品数据、订单数据，自动同步到飞书多维表格里，不用手动复制粘贴。

### 2.2 数据库设计

不需要你自己建表，飞书那边的多维表格就是你的"数据库"。

飞书里建了3张表：
| 表名 | 表ID | 作用 |
|---|---|---|
| 菜品管理表 | tblYNP7LuPOsCJoy | 存菜品信息 + 累计销量 |
| 订单记录表 | tblJSJMN08TDjek1 | 存每一笔订单 |
| 桌台管理表 | tblEShRZ8GNwpzr3 | 存桌台信息 |

### 2.3 代码链路（一笔订单怎么同步到飞书）

```
顾客扫码下单
    ↓
后端保存到MySQL orders表
    ↓
... 一天结束 ...
    ↓
凌晨2点，定时任务FeishuSyncTask触发
    ↓
从MySQL查昨天的所有订单
    ↓
转换成飞书需要的JSON格式
    ↓
调用FeishuApiClient.batchCreateRecords()
    ↓
飞书API写入多维表格
    ↓
你在飞书里就能看到今天的营收了
```

### 2.4 核心代码文件

**① application.yml配置**
```yaml
feishu:
  app-id: cli_aa570eccc0b89d29
  app-secret: your-feishu-app-secret-here
  base-token: XXsubCqCzaKiVbsDOOLcAirRn8c
  table:
    dish: tblYNP7LuPOsCJoy
    order: tblJSJMN08TDjek1
```

**② FeishuApiClient.java（飞书工具类）**
做了两件事：
1. `getTenantAccessToken()` — 用app-id和app-secret换临时token（有效期2小时）
2. `batchCreateRecords()` — 批量往多维表格写数据

**③ FeishuSyncTask.java（定时任务）**
```java
@Scheduled(cron = "0 0 2 * * ?")  // 每天凌晨2点
public void syncYesterdayOrders() {
    // 1. 查昨天的订单
    // 2. 转格式
    // 3. 调飞书API写入
}
```

---

## 三、AI菜品推荐

### 3.1 功能是什么

顾客点餐的时候，输入"想吃点辣的"或者"一个人吃"，AI自动推荐符合条件的菜品。

### 3.2 数据库设计

不需要新建表，直接用现有的 `dish`（菜品表）。

### 3.3 代码链路（从顾客输入到推荐结果）

```
顾客在小程序点"AI推荐"
    ↓
输入："一个人吃，不要太辣"
    ↓
前端调用 POST /api/ai/recommend
    ↓
后端AiRecommendService开始处理：
    1. 先查数据库里所有上架的菜品
    2. 过滤掉饮品、加菜、例牌（只留主食和汤粉饭）
    3. 把菜品列表 + 顾客需求 拼成一个Prompt
    4. 调用豆包API（火山引擎方舟）
    ↓
豆包大模型返回推荐的菜名
    ↓
后端再去数据库匹配这些菜名对应的真实菜品
    ↓
返回给前端展示
```

### 3.4 核心代码文件

**① AiProperties.java（配置类）**
```java
@Component
@ConfigurationProperties(prefix = "ai")
public class AiProperties {
    private String apiKey;      // 豆包API Key
    private String apiUrl;      // 接口地址
    private String model;       // 接入点ID（ep-xxx）
    private List<String> recommendCategories;  // 哪些分类可以推荐
}
```

**② AiRecommendService.java（核心逻辑）**

做了这几步：
1. **查菜品** — 从数据库查所有上架的菜品
2. **过滤分类** — 只留主食和汤粉饭，排除饮品、加菜
3. **拼Prompt** — 告诉大模型：这是我们的菜单，顾客想要xxx，帮我推荐3个菜
4. **调API** — HTTP请求调豆包接口
5. **匹配回真实菜品** — 大模型返回菜名后，再去数据库找对应的真实菜品ID、图片、价格

**③ AiController.java（接口）**
```java
@PostMapping("/api/ai/recommend")
public Result<List<Dish>> recommend(@RequestBody Map<String, String> body) {
    String userInput = body.get("input");
    return Result.success(aiRecommendService.recommend(userInput));
}
```

### 3.5 前端实现

在点餐页面顶部加了一个AI推荐横幅：
- 顾客点"AI推荐" → 弹出输入框
- 输入想吃什么 → 点确认
- 加载动画 → 展示推荐的菜品卡片
- 下面有两个按钮：「换一换」「重新输入」

**换一换的逻辑：**
- 前端维护一个 `excludeIds` 数组
- 每次换一批，把之前推荐过的菜品ID加进去
- 调API的时候告诉大模型：这些菜不要推荐了
- 同时把temperature调到0.9，让结果更多样

---

## 四、智能客服RAG

### 4.1 功能是什么

顾客在"我的"页面点"智能客服"，可以像聊天一样问问题，比如：
- "你们几点开门？"
- "打包要钱吗？"
- "有什么推荐的？"

AI会自动回答。

### 4.2 什么是RAG

简单说：
> 顾客问问题 → 先从你的知识库里找相关资料 → 把资料和问题一起给大模型 → 大模型基于资料回答

**为什么要用RAG？**
- 不用大模型凭空瞎编
- 答案是基于你自己店铺的真实信息
- 想改答案？改知识库就行，不用改代码

### 4.3 数据库设计

新建了一张表：`ai_qa`（FAQ知识库表）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | bigint | 主键 |
| question | varchar | 问题 |
| answer | varchar | 答案 |
| create_time | datetime | 创建时间 |
| update_time | datetime | 更新时间 |

### 4.4 代码链路（顾客问问题到AI回答）

```
顾客在客服对话框输入："打包要钱吗？"
    ↓
前端调用 POST /api/ai/chat
    ↓
后端AiChatService开始处理：
    1. 先查知识库里所有的FAQ
    2. 再查一下店铺的基本信息（打包费、营业时间等）
    3. 把FAQ列表 + 店铺信息 + 顾客问题 拼成一个Prompt
    4. 告诉大模型："你是禧粤美食的客服，根据以下知识库回答顾客问题"
    ↓
调用豆包API
    ↓
大模型返回答案
    ↓
返回给前端展示
```

### 4.5 核心代码文件

**① AiChatService.java（客服核心逻辑）**

做了这几步：
1. **查FAQ** — 从ai_qa表查所有常见问题和答案
2. **查菜单** — 顺便查一下菜品列表，顾客问推荐的时候能用上
3. **拼Prompt** — 这是最关键的一步：

```
你是禧粤美食烧腊店的智能客服。
请根据以下知识库内容回答顾客问题：

【知识库FAQ】
Q: 营业时间？
A: 早上10点到晚上10点

Q: 打包费多少？
A: 打包加收1元

【菜品菜单】
招牌烧鹅饭 20元
烧鸭饭 15元
...

顾客问题：打包要钱吗？
请用友好的语气回答，不要太长。
```

4. **调豆包API** — 把这个Prompt发给大模型
5. **返回答案** — 大模型返回的内容直接给顾客

### 4.6 前端实现

入口在"我的"页面，和"切换桌台"一样做成列表项：
- 💬 智能客服

点进去是一个全屏聊天窗口：
- 上面是消息列表（顾客问题在右边，AI回答在左边）
- 下面是输入框 + 发送按钮

**踩过的坑：**
- 输入框被底部tabBar挡住了 → 加了底部安全区适配
- 消息气泡被截断 → 宽度设成75%，自动换行
- 弹窗高度不对 → 改成全屏弹窗，适配手机屏幕

---

## 五、知识库管理后台

### 5.1 功能是什么

管理员不用去数据库插数据，直接在小程序后台就能：
- 看所有FAQ列表
- 新增问题和答案
- 编辑/删除
- 多选批量删除
- AI自动生成FAQ
- AI智能去重

### 5.2 代码链路

```
管理员在小程序点"知识库管理"
    ↓
前端调用 GET /api/admin/ai-qa
    ↓
后端查ai_qa表，返回列表
    ↓
前端展示

管理员点"AI生成FAQ"
    ↓
前端调用 POST /api/admin/ai-qa/generate
    ↓
后端AiQaGenerateService：
    1. 先查已有的所有问题（避免重复）
    2. 查一下菜品菜单
    3. 拼Prompt："根据这些菜品，帮我生成50条常见问题和答案"
    4. 调豆包API
    5. 把结果批量插入ai_qa表
    ↓
返回生成了多少条
```

### 5.3 核心代码文件

**① AiQaAdminController.java（后台接口）**
```java
@RestController
@RequestMapping("/api/admin/ai-qa")
public class AiQaAdminController {
    
    @GetMapping                    // 列表
    @PostMapping                   // 新增
    @PutMapping("/{id}")           // 编辑
    @DeleteMapping("/{id}")        // 删除
    @PostMapping("/generate")      // AI生成FAQ
    @PostMapping("/deduplicate")   // AI智能去重
}
```

**② AiQaGenerateService.java（AI生成FAQ）**

三重去重逻辑：
1. **生成前** — 先查所有已有问题，放进Prompt里，告诉大模型"这些问题已经有了，不要重复"
2. **插入前** — 再对比一次数据库，重复的就不插
3. **饱和时** — 如果实在想不出新问题了，返回"问题基本饱和，可手动输入"

**③ AiQaDedupService.java（AI智能去重）**

用AI找出语义相似的问题：
- 比如"烧鹅饭多少钱？"和"招牌烧鹅饭价格是多少？"意思差不多
- AI判断哪些是重复的，自动删掉多余的

### 5.4 前端实现

管理员首页加了两个入口：
- 🤖 AI设置
- 📚 知识库管理

知识库管理页面：
- 顶部：搜索框 + 「AI生成」「智能去重」按钮
- 中间：FAQ列表，每条显示问题和答案
- 每条右边：编辑、删除按钮
- 支持多选批量删除

---

## 六、AI开关管理

### 6.1 功能是什么

管理员不用改配置文件重启，直接在后台界面就能开关AI功能：
- AI菜品推荐开关
- 智能客服开关

关掉之后，小程序里就不显示AI功能了。

### 6.2 数据库设计

新建了一张表：`ai_config`（配置表）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | bigint | 主键 |
| config_key | varchar | 配置名（比如 ai_recommend_enabled） |
| config_value | varchar | 配置值（true/false） |

### 6.3 代码链路

```
管理员在后台开关AI
    ↓
前端调用 PUT /api/admin/ai-config
    ↓
后端更新ai_config表

顾客打开小程序
    ↓
前端请求AI推荐接口
    ↓
后端AiConfigService先查一下开关：
    如果是关闭状态 → 直接返回"AI推荐已关闭"
    如果是开启状态 → 正常调用大模型
```

### 6.4 核心代码文件

**① AiConfigService.java（开关服务）**
```java
public boolean isEnabled(String key) {
    // 从数据库查这个开关是开还是关
    // 查不到默认开
}
```

**② 用在哪里：**
- AiRecommendService开头先查：如果推荐开关关了，直接报错
- AiChatService开头先查：如果客服开关关了，直接报错

---

## 七、踩坑总结

### 7.1 飞书多维表格踩的坑

| 坑 | 原因 | 解决方法 |
|---|---|---|
| 写入报91403错误 | 多维表格没开编辑权限 | 分享设置改成「组织内可编辑」 |
| 找不到表 | 把wiki页面ID当成表ID | 进base里看真实的table_id（tbl开头） |
| 写入失败 | 字段名对不上 | 去飞书里确认字段名一模一样 |
| 定时任务不跑 | 后端没重启 | 改完代码要重启Spring Boot |

### 7.2 AI推荐踩的坑

| 坑 | 原因 | 解决方法 |
|---|---|---|
| 换一批结果不变 | temperature太低，结果太固定 | temperature调到0.9 + 前端维护排除列表 |
| 推荐出饮品 | 没做分类过滤 | 配置recommendCategories，只留主食和汤粉饭 |
| 调用报错 | model参数填错了 | 要填接入点ID（ep-xxx），不是模型名 |

### 7.3 智能客服踩的坑

| 坑 | 原因 | 解决方法 |
|---|---|---|
| 输入框被挡住 | 底部tabBar遮挡 | 加安全区适配，改成全屏弹窗 |
| 答案不对 | Prompt没写好 | 把知识库 + 店铺信息都拼进Prompt |
| 回答打包免费 | 之前写死了Prompt | 改成动态读系统设置里的打包费 |

---

## 八、下一步可以做什么

1. **第3层：经营数据问答Agent** — 管理员问"这个月营收多少？"，AI自动查数据库回答
2. **实时数据同步** — 每笔订单完成立刻同步到飞书，不用等第二天
3. **向量检索RAG** — 现在是全量FAQ拼进Prompt，数据多了会慢，以后改成向量检索
4. **飞书机器人通知** — 每天营收自动发消息给你

---

> 📌 这份文档是基于「禧粤美食」项目实战总结的
> 从建表 → 写代码 → 调API → 踩坑，全流程都在这了
