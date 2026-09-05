/**
 * cart —— 购物车页：明细调整 + 备注 + 提交订单
 */
const api = require('../../utils/request');
const util = require('../../utils/util');
const app = getApp();

Page({
  data: {
    items: [],
    count: 0,
    total: 0,
    submitting: false,
    tableNo: ''
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 });
    }
    this.setData({ tableNo: app.globalData.tableNo });
    this.loadCart();
  },

  loadCart() {
    const c = app.calcCart(app.getCart());
    this.setData({ items: c.items, count: c.count, total: c.total });
  },

  inc(e) {
    const key = e.currentTarget.dataset.key;
    const cart = app.getCart();
    if (cart[key]) {
      cart[key].qty += 1;
      app.saveCart(cart);
      this.loadCart();
    }
  },

  dec(e) {
    const key = e.currentTarget.dataset.key;
    const cart = app.getCart();
    if (!cart[key]) return;
    cart[key].qty -= 1;
    if (cart[key].qty <= 0) {
      delete cart[key];
    }
    app.saveCart(cart);
    this.loadCart();
  },

  remove(e) {
    const key = e.currentTarget.dataset.key;
    const item = this.data.items.find(i => i.key === key);
    const name = item ? item.name : '该菜品';
    util.confirm('确定移除「' + name + '」吗？', '移除菜品').then(ok => {
      if (!ok) return;
      const cart = app.getCart();
      delete cart[key];
      app.saveCart(cart);
      this.loadCart();
    });
  },

  onRemarkInput(e) {
    const key = e.currentTarget.dataset.key;
    const value = e.detail.value;
    const cart = app.getCart();
    if (cart[key]) {
      cart[key].remark = value;
      app.saveCart(cart);
    }
  },

  /** 提交订单 */
  submit() {
    if (this.data.count === 0) {
      util.toast('购物车是空的');
      return;
    }
    if (!app.globalData.tableId) {
      util.toast('请先选择桌台');
      return;
    }
    if (this.data.submitting) return;
    this.setData({ submitting: true });

    const items = this.data.items.map(i => ({
      dishId: i.id,
      quantity: i.qty,
      price: i.price,
      specOptionIds: i.specOptionIds || [],
      remark: i.remark || ''
    }));

    app.ensureUserId().then(userId => {
      const payload = {
        shopId: app.globalData.shopId,
        tableId: app.globalData.tableId,
        userId,
        remark: '',
        items
      };
      return api.createOrder(payload);
    }).then(order => {
      // 下单成功：清空购物车
      app.saveCart({});
      this.loadCart();
      this.setData({ submitting: false });
      wx.showModal({
        title: '下单成功！',
        content: '订单已送达后厨，请耐心等待上菜\n订单号：' + (order.orderNo || ''),
        confirmText: '查看订单',
        confirmColor: '#ff6b2c',
        success: () => {
          wx.switchTab({ url: '/pages/orders/orders' });
        }
      });
    }).catch(e => {
      this.setData({ submitting: false });
      util.toast('下单失败：' + e.message);
    });
  }
});
