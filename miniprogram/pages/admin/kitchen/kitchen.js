/**
 * admin/kitchen —— 接单工作台：订单列表（统一显示"已下单"，无状态流转）
 */
const api = require('../../../utils/request');
const util = require('../../../utils/util');
const app = getApp();

Page({
  data: {
    orders: [],
    tables: [],
    loading: true
  },

  onShow() {
    this.loadTables().then(() => this.loadOrders());
  },

  /** 加载桌台（用于桌号映射，只加载一次） */
  loadTables() {
    if (this.data.tables && this.data.tables.length) return Promise.resolve();
    return api.listTables(app.globalData.shopId).then(list => {
      this.setData({ tables: list || [] });
    }).catch(() => {});
  },

  onPullDownRefresh() {
    this.loadOrders(() => wx.stopPullDownRefresh());
  },

  loadOrders(done) {
    this.setData({ loading: true });
    // 不传状态，加载全部订单
    api.listOrders('').then(list => {
      const orders = (list || []).map(o => ({
        ...o,
        tableNo: this.tableNo(o.tableId),
        itemsPreview: this.previewItems(o.items),
        remarks: this.collectRemarks(o.items)
      }));
      this.setData({ orders, loading: false });
      if (done) done();
    }).catch(e => {
      this.setData({ loading: false });
      util.toast('订单加载失败：' + e.message);
      if (done) done();
    });
  },

  /** 桌号映射（订单接口只有 tableId） */
  tableNo(tableId) {
    const t = this.data.tables && this.data.tables.find(x => x.id === tableId);
    return t ? t.tableNo : ('桌' + tableId);
  },

  previewItems(items) {
    if (!items || !items.length) return '';
    const head = items.slice(0, 3).map(it => it.dishName + '×' + it.quantity).join('、');
    return items.length > 3 ? head + ' 等' + items.length + ' 项' : head;
  },

  /** 收集订单明细中的备注，合并显示 */
  collectRemarks(items) {
    if (!items || !items.length) return '';
    const list = [];
    items.forEach(it => {
      if (it.remark && it.remark.trim()) {
        list.push(it.dishName + '：' + it.remark.trim());
      }
    });
    return list.join('；');
  },

  goDetail(e) {
    wx.navigateTo({
      url: '/pages/admin/order-detail/order-detail?orderId=' + e.currentTarget.dataset.id
    });
  }
});
