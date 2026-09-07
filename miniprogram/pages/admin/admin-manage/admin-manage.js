/**
 * admin-manage —— 管理员设置：通过用户ID添加/移除管理员
 */
const api = require('../../../utils/request');
const app = getApp();

Page({
  data: {
    inputUserId: '',
    loading: false
  },

  onInput(e) {
    this.setData({ inputUserId: e.detail.value });
  },

  /** 设为管理员 */
  setAdmin() {
    const userId = parseInt(this.data.inputUserId);
    if (!userId || userId <= 0) {
      wx.showToast({ title: '请输入有效的用户ID', icon: 'none' });
      return;
    }
    if (userId === app.globalData.userId) {
      wx.showToast({ title: '不能修改自己的权限', icon: 'none' });
      return;
    }
    this.setData({ loading: true });
    api.setAdmin(userId, 1).then(() => {
      wx.showToast({ title: '已设为管理员', icon: 'success' });
      this.setData({ inputUserId: '', loading: false });
    }).catch(err => {
      wx.showToast({ title: '设置失败：' + err.message, icon: 'none' });
      this.setData({ loading: false });
    });
  },

  /** 取消管理员 */
  removeAdmin() {
    const userId = parseInt(this.data.inputUserId);
    if (!userId || userId <= 0) {
      wx.showToast({ title: '请输入有效的用户ID', icon: 'none' });
      return;
    }
    if (userId === app.globalData.userId) {
      wx.showToast({ title: '不能修改自己的权限', icon: 'none' });
      return;
    }
    wx.showModal({
      title: '确认取消',
      content: '确定取消该用户的管理员权限吗？',
      success: (res) => {
        if (!res.confirm) return;
        this.setData({ loading: true });
        api.setAdmin(userId, 0).then(() => {
          wx.showToast({ title: '已取消管理员', icon: 'success' });
          this.setData({ inputUserId: '', loading: false });
        }).catch(err => {
          wx.showToast({ title: '操作失败：' + err.message, icon: 'none' });
          this.setData({ loading: false });
        });
      }
    });
  }
});
