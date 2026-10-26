/**
 * order-detail —— 顾客端订单详情
 */
const api = require('../../utils/request');
const util = require('../../utils/util');

Page({
  data: {
    order: null,
    items: [],
    statusText: '',
    statusTag: ''
  },

  onLoad(options) {
    const orderId = options.orderId;
    if (!orderId) {
      util.toast('缺少订单ID');
      return;
    }
    Promise.all([
      api.orderDetail(orderId),
      api.orderItems(orderId)
    ]).then(([order, items]) => {
      // 自提订单 tableId=0，桌号显示"自提"而非"-"
      const tableNoText = order.tableId === 0 ? '自提' : (order.tableId ? String(order.tableId) : '-');
      this.setData({
        order: { ...order, tableNoText },
        items: items || [],
        statusText: util.orderStatusText(order.status),
        statusTag: util.orderStatusTag(order.status)
      });
    }).catch(e => {
      util.toast('加载失败：' + e.message);
    });
  }
});
