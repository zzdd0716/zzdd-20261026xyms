// 顾客扫码点餐端 API 封装
// 调用后端接口，处理 Result{code,message,data} 结构
const CusApi = (function () {
  // 后端基础地址（与前端同源）
  const BASE = '';

  // 从 URL 参数读取门店ID和桌台ID
  function getParam(name) {
    const m = new URLSearchParams(window.location.search).get(name);
    return m ? Number(m) : null;
  }
  const shopId = getParam('shopId') || 1;
  const tableId = getParam('tableId') || 1;

  async function request(url, options) {
    const resp = await fetch(BASE + url, {
      headers: { 'Content-Type': 'application/json' },
      ...options
    });
    if (!resp.ok) {
      throw new Error('请求失败：' + resp.status);
    }
    const result = await resp.json();
    if (result.code !== 200) {
      throw new Error(result.message || '操作失败');
    }
    return result.data;
  }

  function get(url) {
    return request(url, { method: 'GET' });
  }

  return {
    shopId,
    tableId,

    // 菜单分类
    listCategories() {
      return get('/api/menu/categories?shopId=' + shopId);
    },
    // 菜品列表（上架菜品，可按分类筛选）
    listDishes(categoryId) {
      const q = categoryId ? '&categoryId=' + categoryId : '';
      return get('/api/menu/dishes?shopId=' + shopId + q);
    },
    // 顾客下单：携带所选规格选项ID（含双拼）与条目备注，金额后端以菜品价+规格加价校验
    createOrder(items, remark) {
      const body = {
        shopId,
        tableId,
        remark: remark || '',
        items: items.map(i => ({
          dishId: i.id,
          quantity: i.qty,
          price: i.price,
          specOptionIds: i.specOptionIds || [],
          remark: i.remark || ''
        }))
      };
      return request('/api/order/create', { method: 'POST', body: JSON.stringify(body) });
    },
    // 查询订单列表
    listOrders() {
      return get('/api/order/list');
    }
  };
})();
