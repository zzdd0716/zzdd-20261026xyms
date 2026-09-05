/**
 * admin/order-detail —— 商家订单详情：主信息 + 菜品明细（无状态流转）
 */
const api = require('../../../utils/request');
const util = require('../../../utils/util');
const app = getApp();

Page({
  data: {
    orderId: null,
    order: null,
    items: [],
    tables: [],
    tableNo: ''
  },

  onLoad(options) {
    this.setData({ orderId: options.orderId });
    this.load();
  },

  load() {
    const orderId = this.data.orderId;
    if (!orderId) return;
    Promise.all([
      api.orderDetail(orderId),
      api.orderItems(orderId),
      api.listTables(app.globalData.shopId).catch(() => [])
    ]).then(([order, items, tables]) => {
      const t = (tables || []).find(x => x.id === order.tableId);
      this.setData({
        order,
        items: items || [],
        tables,
        tableNo: t ? t.tableNo : ('桌' + (order.tableId || '-'))
      });
    }).catch(e => {
      util.toast('加载失败：' + e.message);
    });
  }
});
