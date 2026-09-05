// app.js —— 扫码点餐小程序全局逻辑
const api = require('./utils/request');
const { uuid } = require('./utils/util');

App({
  globalData: {
    // 门店与桌台（首页选择后写入）
    shopId: 1,
    tableId: null,
    tableNo: '',
    // 当前用户（openid 换取的数据库 userId）
    userId: null,
    // 本地持久 openid（首次启动生成，用于"我的订单"区分用户）
    openid: ''
  },

  onLaunch() {
    // 1. 确保本地 openid 唯一持久
    let openid = wx.getStorageSync('wx_openid');
    if (!openid) {
      openid = 'wx_' + uuid();
      wx.setStorageSync('wx_openid', openid);
    }
    this.globalData.openid = openid;

    // 2. 登录：openid 换 userId（后端自动注册，幂等）
    this.login();
  },

  login() {
    const openid = this.globalData.openid;
    if (!openid) return;
    api.login(openid).then(userId => {
      this.globalData.userId = userId;
    }).catch(() => {
      // 后端未启动时静默失败，下单/查单时会再提示
      console.warn('登录失败：请确认后端服务已启动');
    });
  },

  /** 获取当前用户ID（未登录则尝试登录后返回 Promise） */
  ensureUserId() {
    if (this.globalData.userId) {
      return Promise.resolve(this.globalData.userId);
    }
    return api.login(this.globalData.openid).then(userId => {
      this.globalData.userId = userId;
      return userId;
    });
  },

  /** 读取购物车 */
  getCart() {
    return wx.getStorageSync('cart') || {};
  },

  /** 保存购物车 */
  saveCart(cart) {
    wx.setStorageSync('cart', cart);
  },

  /** 计算购物车条目/数量/金额 */
  calcCart(cart) {
    const items = Object.keys(cart || {}).map(k => cart[k]);
    const count = items.reduce((s, i) => s + (Number(i.qty) || 0), 0);
    const total = items.reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.qty) || 0), 0);
    return { items, count, total: Math.round(total * 100) / 100 };
  }
});
