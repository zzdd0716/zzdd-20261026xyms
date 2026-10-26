// app.js —— 扫码点餐小程序全局逻辑
const api = require('./utils/request');
const { uuid } = require('./utils/util');

App({
  globalData: {
    // 门店与桌台（首页选择后写入）
    shopId: 1,
    tableId: null,
    tableNo: '',
    // 进入模式：null=堂食（扫码进桌台） pickup=自提码进入（默认打包且不可更改）
    entryMode: null,
    // 当前用户（openid 换取的数据库 userId）
    userId: null,
    // 是否管理员（只有管理员能进商家后台）
    isAdmin: false,
    // 本地持久 openid（首次启动生成，用于"我的订单"区分用户）
    openid: '',
    // 用户昵称和头像
    nickname: '',
    avatar: ''
  },

  onLaunch() {
    // 登录：wx.login 获取 code，后端用 code 换真实 openid
    this.login();
  },

  login() {
    wx.login({
      success: (res) => {
        if (!res.code) {
          console.warn('wx.login 获取 code 失败');
          return;
        }
        api.login(res.code).then(user => {
          this.globalData.userId = user.id;
          this.globalData.isAdmin = user.isAdmin === 1;
          this.globalData.openid = user.openid || '';
          this.globalData.nickname = user.nickname || '';
          this.globalData.avatar = user.avatar || '';
        }).catch(() => {
          console.warn('登录失败：请确认后端服务已启动');
        });
      },
      fail: () => {
        console.warn('wx.login 失败');
      }
    });
  },

  /** 获取当前用户ID（未登录则尝试登录后返回 Promise） */
  ensureUserId() {
    if (this.globalData.userId) {
      return Promise.resolve(this.globalData.userId);
    }
    return new Promise((resolve, reject) => {
      wx.login({
        success: (res) => {
          if (!res.code) { reject(new Error('wx.login失败')); return; }
          api.login(res.code).then(user => {
            this.globalData.userId = user.id;
            this.globalData.isAdmin = user.isAdmin === 1;
            this.globalData.openid = user.openid || '';
            this.globalData.nickname = user.nickname || '';
            this.globalData.avatar = user.avatar || '';
            resolve(user.id);
          }).catch(reject);
        },
        fail: reject
      });
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
