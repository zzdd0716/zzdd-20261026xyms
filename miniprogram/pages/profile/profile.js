/**
 * profile —— 我的：门店/桌台信息 + 商家管理后台入口
 */
const config = require('../../utils/config');
const app = getApp();

Page({
  data: {
    tableNo: '',
    shopId: 1,
    userId: null,
    openidTail: '',
    baseUrl: config.BASE_URL
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3 });
    }
    const g = app.globalData;
    this.setData({
      tableNo: g.tableNo,
      shopId: g.shopId,
      userId: g.userId,
      openidTail: g.openid ? g.openid.slice(-6) : ''
    });
  },

  /** 切换桌台（回到首页重新选择） */
  changeTable() {
    wx.reLaunch({ url: '/pages/index/index' });
  },

  /** 进入商家管理后台 */
  goAdmin() {
    wx.navigateTo({ url: '/pages/admin/home/home' });
  }
});
