// 商家后台 API 封装层
// 统一调用后端接口，处理 Result{code,message,data} 结构
const Api = (function () {
  // 后端基础地址（与前端同源，Spring Boot 直接托管）
  const BASE = '';

  // 门店 ID（当前默认 1 号店）
  const SHOP_ID = 1;

  // 通用请求方法：解析 Result 结构，code!=200 抛异常
  async function request(url, options) {
    const resp = await fetch(BASE + url, {
      headers: { 'Content-Type': 'application/json' },
      ...options
    });
    if (!resp.ok) {
      throw new Error('HTTP ' + resp.status + '：' + resp.statusText);
    }
    const result = await resp.json();
    if (result.code !== 200) {
      throw new Error(result.message || '请求失败（code=' + result.code + '）');
    }
    return result.data;
  }

  function get(url) {
    return request(url, { method: 'GET' });
  }

  function post(url, body) {
    return request(url, { method: 'POST', body: JSON.stringify(body || {}) });
  }

  function del(url) {
    return request(url, { method: 'DELETE' });
  }

  return {
    SHOP_ID,

    // ===== 菜品管理 =====
    // 商家查全部菜品（含下架）
    listDishes() {
      return get('/api/admin/dishes?shopId=' + SHOP_ID);
    },
    // 新增/修改菜品（带 id 为修改）
    saveDish(dish) {
      return post('/api/admin/dish', dish);
    },
    // 删除菜品
    deleteDish(id) {
      return del('/api/admin/dish/' + id);
    },

    // ===== 分类管理 =====
    // 商家查全部分类（含停用）
    listCategories() {
      return get('/api/admin/categories?shopId=' + SHOP_ID);
    },
    // 新增/修改分类
    saveCategory(category) {
      return post('/api/admin/category', category);
    },
    // 删除分类
    deleteCategory(id) {
      return del('/api/admin/category/' + id);
    },

    // ===== 桌台管理 =====
    // 桌台列表
    listTables() {
      return get('/api/admin/tables?shopId=' + SHOP_ID);
    },
    // 新增/修改桌台
    saveTable(table) {
      return post('/api/admin/table', table);
    },
    // 删除桌台
    deleteTable(id) {
      return del('/api/admin/table/' + id);
    },

    // ===== 订单管理（后厨/商家共用）=====
    // 按状态查订单，status 为空查全部
    listOrders(status) {
      const q = status === undefined || status === null || status === '' ? '' : '?status=' + status;
      return get('/api/order/list' + q);
    },
    // 订单详情
    orderDetail(orderId) {
      return get('/api/order/detail/' + orderId);
    },
    // 订单明细（含规格快照，供后厨查看）
    orderItems(orderId) {
      return get('/api/order/items/' + orderId);
    },
    // 更新订单状态（1→2 制作中→3 已上菜→4 已完成）
    updateOrderStatus(orderId, status) {
      return request('/api/order/status/' + orderId + '?status=' + status, { method: 'PUT' });
    },

    // ===== 收银统计 =====
    // 按日/周/月/季度汇总入账
    cashierSummary(period) {
      return get('/api/order/cashier?period=' + (period || 'day'));
    },
    // 菜品销量统计（前N名+其他，扇形图数据）
    salesSummary(period, limit) {
      return get('/api/order/sales?period=' + (period || 'day') + '&limit=' + (limit || 5));
    }
  };
})();
