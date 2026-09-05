/**
 * admin/home —— 商家工作台首页（宫格导航）
 */
const config = require('../../../utils/config');
const app = getApp();

Page({
  data: {
    shopId: 1,
    baseUrl: config.BASE_URL
  },

  onShow() {
    this.setData({ shopId: app.globalData.shopId });
  },

  go(e) {
    const page = e.currentTarget.dataset.page;
    wx.navigateTo({ url: page });
  }
});
