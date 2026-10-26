/**
 * orders —— 我的订单（按当前用户过滤）
 */
const api = require('../../utils/request');
const util = require('../../utils/util');
const app = getApp();

Page({
  data: {
    orders: [],
    loading: true,
    tableNo: ''
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 });
    }
    this.setData({ tableNo: app.globalData.tableNo });
    this.loadOrders();
  },

  loadOrders() {
    this.setData({ loading: true });
    app.ensureUserId().then(userId => {
      return api.listMyOrders(userId);
    }).then(list => {
      // 附加状态文案与样式
      const orders = (list || []).map(o => ({
        ...o,
        // 自提订单 tableId=0，桌号显示"自提"而非"-"
        tableNoText: o.tableId === 0 ? '自提' : (o.tableId ? String(o.tableId) : '-'),
        statusText: util.orderStatusText(o.status),
        statusTag: util.orderStatusTag(o.status)
      }));
      this.setData({ orders, loading: false });
    }).catch(e => {
      this.setData({ loading: false });
      util.toast('订单加载失败：' + e.message);
    });
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/order-detail/order-detail?orderId=' + id });
  }
});
