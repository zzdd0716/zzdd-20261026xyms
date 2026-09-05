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
      this.setData({
        order,
        items: items || [],
        statusText: util.orderStatusText(order.status),
        statusTag: util.orderStatusTag(order.status)
      });
    }).catch(e => {
      util.toast('加载失败：' + e.message);
    });
  }
});
