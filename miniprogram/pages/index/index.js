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
    // 支持两种扫码进入方式：
    // 1. 普通小程序码(getwxacode)：参数直接在 options.tableId
    // 2. 无限量小程序码(getwxacodeunlimit)：参数在 options.scene，格式 tableId=1
    let targetId = null;
    if (options.tableId) {
      targetId = Number(options.tableId);
    } else if (options.scene) {
      const scene = decodeURIComponent(options.scene);
      const p = {};
      scene.split('&').forEach(kv => {
        const i = kv.indexOf('=');
        if (i > 0) p[kv.substring(0, i)] = kv.substring(i + 1);
      });
      if (p.tableId) targetId = Number(p.tableId);
    }

    if (targetId) {
      const finalId = targetId;
      api.listTables(app.globalData.shopId).then(list => {
        const table = (list || []).find(t => t.id === finalId);
        app.globalData.tableId = finalId;
        app.globalData.tableNo = table ? table.tableNo : String(finalId);
        wx.switchTab({ url: '/pages/menu/menu' });
      }).catch(() => {
        app.globalData.tableId = finalId;
        app.globalData.tableNo = String(finalId);
        wx.switchTab({ url: '/pages/menu/menu' });
      });
      return;
    }
    this.loadTables();
  },

  loadTables() {
    api.listTables(app.globalData.shopId).then(list => {
      const sorted = (list || []).slice().sort((a, b) => {
        const na = parseInt(a.tableNo, 10);
        const nb = parseInt(b.tableNo, 10);
        if (!isNaN(na) && !isNaN(nb)) return na - nb;
        return String(a.tableNo) > String(b.tableNo) ? 1 : -1;
      });
      this.setData({ tables: sorted, loading: false });
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
