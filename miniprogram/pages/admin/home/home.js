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
    // 权限校验：非管理员不能进入商家后台
    if (!app.globalData.isAdmin) {
      wx.showToast({ title: '无权限访问商家后台', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }
    this.setData({ shopId: app.globalData.shopId });
  },

  go(e) {
    const page = e.currentTarget.dataset.page;
    wx.navigateTo({ url: page });
  }
});
