/**
 * request.js —— wx.request 封装 + 全部后端 API
 * 后端返回统一结构 Result{code, message, data}，code===200 为成功
 */
const config = require('./config');

function request(url, method = 'GET', data = {}) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: config.BASE_URL + url,
      method,
      data,
      header: { 'Content-Type': 'application/json' },
      success(res) {
        if (res.statusCode !== 200) {
          reject(new Error('请求失败 HTTP ' + res.statusCode));
          return;
        }
        const r = res.data;
        if (r.code !== 200) {
          reject(new Error(r.message || '操作失败'));
          return;
        }
        resolve(r.data);
      },
      fail(err) {
        reject(new Error('网络错误：' + (err.errMsg || '') + '（请确认后端服务已启动，且 config.js 中 BASE_URL 正确）'));
      }
    });
  });
}

const get = (url) => request(url, 'GET');
const post = (url, data) => request(url, 'POST', data);
const put = (url, data) => request(url, 'PUT', data);
const del = (url) => request(url, 'DELETE');

const api = {
  // ================= 用户 =================
  /** 登录：wx.login 的 code 换用户信息（不存在自动注册） */
  login(code) {
    return post('/api/user/login', { code });
  },
  /** 设置/取消管理员 */
  setAdmin(userId, isAdmin) {
    return post('/api/user/admin/set', { userId, isAdmin });
  },
  /** 更新用户昵称和头像 */
  updateUser(userId, nickname, avatar) {
    return post('/api/user/update', { userId, nickname, avatar });
  },

  // ================= 顾客端：菜单 =================
  /** 菜单分类 */
  listCategories(shopId) {
    return get('/api/menu/categories?shopId=' + shopId);
  },
  /** 上架菜品（可按分类筛选） */
  listDishes(shopId, categoryId) {
    const q = categoryId ? '&categoryId=' + categoryId : '';
    return get('/api/menu/dishes?shopId=' + shopId + q);
  },
  /** 顾客下单 */
  createOrder(payload) {
    return post('/api/order/create', payload);
  },
  /** 我的订单（按 userId 过滤） */
  listMyOrders(userId) {
    return get('/api/order/list?userId=' + userId);
  },

  // ================= 商家/后厨：订单 =================
  /** 按状态查订单（status 空查全部） */
  listOrders(status) {
    const q = status === undefined || status === null || status === '' ? '' : '?status=' + status;
    return get('/api/order/list' + q);
  },
  /** 订单主信息 */
  orderDetail(orderId) {
    return get('/api/order/detail/' + orderId);
  },
  /** 订单明细（含规格快照） */
  orderItems(orderId) {
    return get('/api/order/items/' + orderId);
  },
  /** 更新订单状态（1→2制作中→3已上菜→4已完成） */
  updateOrderStatus(orderId, status) {
    return put('/api/order/status/' + orderId + '?status=' + status);
  },
  /** 更新明细制作状态（0→1制作中→2已出餐） */
  updateItemStatus(itemId, status) {
    return put('/api/order/item/status/' + itemId + '?status=' + status);
  },

  // ================= 商家：菜品管理 =================
  /** 全部菜品（含下架） */
  adminDishes(shopId) {
    return get('/api/admin/dishes?shopId=' + shopId);
  },
  /** 新增/修改菜品（带 id 为修改） */
  saveDish(dish) {
    return post('/api/admin/dish', dish);
  },
  /** 删除菜品 */
  deleteDish(id) {
    return del('/api/admin/dish/' + id);
  },
  /** 批量更新规格选项状态（单独操作，不影响菜品） */
  updateSpecOptionsStatus(ids, status) {
    return post('/api/admin/spec-options/status', { ids, status });
  },

  // ================= 商家：分类管理 =================
  /** 全部分类（含停用） */
  adminCategories(shopId) {
    return get('/api/admin/categories?shopId=' + shopId);
  },
  /** 新增/修改分类 */
  saveCategory(category) {
    return post('/api/admin/category', category);
  },
  /** 删除分类 */
  deleteCategory(id) {
    return del('/api/admin/category/' + id);
  },

  // ================= 商家：桌台管理 =================
  /** 桌台列表 */
  listTables(shopId) {
    return get('/api/admin/tables?shopId=' + shopId);
  },
  /** 新增/修改桌台 */
  saveTable(table) {
    return post('/api/admin/table', table);
  },
  /** 删除桌台 */
  deleteTable(id) {
    return del('/api/admin/table/' + id);
  },

  // ================= 商家：收银统计 =================
  /** 按日/周/月/季汇总入账 */
  cashierSummary(period) {
    return get('/api/order/cashier?period=' + (period || 'day'));
  },
  /** 菜品销量统计（前N名+其他） */
  salesSummary(period, limit) {
    return get('/api/order/sales?period=' + (period || 'day') + '&limit=' + (limit || 5));
  }
};

module.exports = api;
