/**
 * index —— 首页：桌台选择（模拟"扫码进店"）
 * 真实场景：顾客扫桌上小程序码，scene 参数携带 shopId/tableId，直接进入点餐页
 * 开发阶段：从桌台列表中选择桌号进入
 */
const api = require('../../utils/request');
const app = getApp();

Page({
  data: {
    tables: [],
    loading: true,
    shopName: '我的小店'
  },

  onLoad(options) {
    // 支持小程序码 scene 参数：scene=shopId%3D1%26tableId%3D2（扫码进店）
    const scene = options.scene ? decodeURIComponent(options.scene) : '';
    if (scene) {
      const p = {};
      scene.split('&').forEach(kv => {
        const i = kv.indexOf('=');
        if (i > 0) p[kv.substring(0, i)] = kv.substring(i + 1);
      });
      if (p.tableId) {
        app.globalData.shopId = p.shopId ? Number(p.shopId) : app.globalData.shopId;
        app.globalData.tableId = Number(p.tableId);
        app.globalData.tableNo = String(p.tableId).padStart(2, '0');
        wx.switchTab({ url: '/pages/menu/menu' });
        return;
      }
    }
    this.loadTables();
  },

  loadTables() {
    api.listTables(app.globalData.shopId).then(list => {
      this.setData({ tables: list || [], loading: false });
    }).catch(e => {
      this.setData({ loading: false });
      wx.showToast({ title: '桌台加载失败：' + e.message, icon: 'none', duration: 2500 });
    });
  },

  chooseTable(e) {
    const t = e.currentTarget.dataset.table;
    app.globalData.tableId = t.id;
    app.globalData.tableNo = t.tableNo;
    wx.switchTab({ url: '/pages/menu/menu' });
  },

  /** 兜底：直接进 1 号桌 */
  quickEnter() {
    app.globalData.tableId = 1;
    app.globalData.tableNo = '01';
    wx.switchTab({ url: '/pages/menu/menu' });
  }
});
