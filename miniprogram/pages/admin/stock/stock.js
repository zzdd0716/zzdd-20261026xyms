/**
 * admin/stock —— 库存管理：快速查看/修改所有菜品库存，支持勾选批量操作
 */
const api = require('../../../utils/request');
const util = require('../../../utils/util');
const app = getApp();

Page({
  data: {
    categories: [],
    activeCate: 'all',
    dishes: [],
    filteredList: [],
    loading: true,
    keyword: '',
    selectedIds: [],
    allSelected: false
  },

  onShow() {
    this.load();
  },

  onPullDownRefresh() {
    this.load(() => wx.stopPullDownRefresh());
  },

  load(done) {
    const shopId = app.globalData.shopId;
    this.setData({ loading: true });
    Promise.all([
      api.adminCategories(shopId),
      api.adminDishes(shopId)
    ]).then(([cats, dishes]) => {
      const patch = { categories: cats, dishes: dishes || [], loading: false };
      this.setData(patch);
      this.refreshView();
      if (done) done();
    }).catch(e => {
      this.setData({ loading: false });
      util.toast('加载失败：' + e.message);
      if (done) done();
    });
  },

  switchCate(e) {
    this.setData({ activeCate: e.currentTarget.dataset.id });
    this.refreshView();
    this.updateSelectState();
  },

  onKeywordInput(e) {
    this.setData({ keyword: e.detail.value });
    this.refreshView();
    this.updateSelectState();
  },

  refreshView() {
    const { activeCate, dishes, keyword, categories, selectedIds } = this.data;
    let list = dishes || [];
    if (activeCate !== 'all') {
      list = list.filter(d => String(d.categoryId) === String(activeCate));
    }
    const kw = (keyword || '').trim().toLowerCase();
    if (kw) {
      list = list.filter(d => (d.name || '').toLowerCase().includes(kw));
    }
    const cateMap = {};
    (categories || []).forEach(c => { cateMap[c.id] = c.name; });
    const filteredList = list.map(d => ({
      ...d,
      cateName: cateMap[d.categoryId] || '未分类',
      editingStock: d.stock,
      checked: selectedIds.includes(d.id)
    }));
    this.setData({ filteredList });
  },

  // 勾选/取消单个
  toggleSelect(e) {
    const id = e.currentTarget.dataset.id;
    let selectedIds = [...this.data.selectedIds];
    const idx = selectedIds.indexOf(id);
    if (idx >= 0) {
      selectedIds.splice(idx, 1);
    } else {
      selectedIds.push(id);
    }
    this.setData({ selectedIds });
    this.updateSelectState();
    this.refreshView();
  },

  // 全选/取消全选（当前筛选结果）
  toggleSelectAll() {
    if (this.data.allSelected) {
      this.setData({ selectedIds: [], allSelected: false });
    } else {
      const ids = this.data.filteredList.map(d => d.id);
      this.setData({ selectedIds: ids, allSelected: true });
    }
    this.refreshView();
  },

  updateSelectState() {
    const visibleIds = this.data.filteredList.map(d => d.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every(id => this.data.selectedIds.includes(id));
    this.setData({ allSelected });
  },

  // 批量设置库存
  batchSetStock() {
    if (this.data.selectedIds.length === 0) {
      util.toast('请先勾选菜品');
      return;
    }
    wx.showModal({
      title: '批量设置库存',
      content: ' ',
      editable: true,
      placeholderText: '',
      success: (res) => {
        if (!res.confirm) return;
        const stock = parseInt(res.content);
        if (isNaN(stock) || stock < 0) {
          util.toast('请输入有效库存');
          return;
        }
        this.batchUpdate({ stock, status: stock > 0 ? 1 : 0 }, `已将 ${this.data.selectedIds.length} 个菜品库存设为 ${stock}`);
      }
    });
  },

  // 批量下架
  batchOffline() {
    if (this.data.selectedIds.length === 0) {
      util.toast('请先勾选菜品');
      return;
    }
    util.confirm(`确定将选中的 ${this.data.selectedIds.length} 个菜品下架吗？`, '批量下架').then(ok => {
      if (!ok) return;
      this.batchUpdate({ status: 0 }, `已下架 ${this.data.selectedIds.length} 个菜品`);
    });
  },

  // 批量上架
  batchOnline() {
    if (this.data.selectedIds.length === 0) {
      util.toast('请先勾选菜品');
      return;
    }
    this.batchUpdate({ status: 1 }, `已上架 ${this.data.selectedIds.length} 个菜品`);
  },

  // 批量更新通用方法
  batchUpdate(patch, successMsg) {
    wx.showLoading({ title: '处理中...' });
    const shopId = app.globalData.shopId;
    const tasks = this.data.selectedIds.map(id =>
      api.saveDish({ id, shopId, ...patch })
    );
    Promise.all(tasks).then(() => {
      wx.hideLoading();
      util.toast(successMsg, 'success');
      this.setData({ selectedIds: [], allSelected: false });
      this.load();
    }).catch(err => {
      wx.hideLoading();
      util.toast('操作失败：' + err.message);
    });
  },

  // 单个修改库存
  onStockInput(e) {
    const id = e.currentTarget.dataset.id;
    const val = e.detail.value;
    const list = this.data.filteredList.map(d => {
      if (d.id === id) {
        return { ...d, editingStock: val === '' ? '' : parseInt(val) || 0 };
      }
      return d;
    });
    this.setData({ filteredList: list });
  },

  saveStock(e) {
    const id = e.currentTarget.dataset.id;
    const item = this.data.filteredList.find(d => d.id === id);
    if (!item) return;
    const stock = item.editingStock;
    if (stock === '' || stock === null || stock === undefined || isNaN(stock)) {
      util.toast('请输入有效库存');
      return;
    }
    if (stock < 0) {
      util.toast('库存不能为负数');
      return;
    }
    wx.showLoading({ title: '保存中...' });
    const status = stock > 0 ? 1 : 0;
    api.saveDish({
      id: id,
      shopId: app.globalData.shopId,
      stock: stock,
      status: status
    }).then(() => {
      wx.hideLoading();
      util.toast(stock > 0 ? '库存已更新并上架' : '已售罄并下架', 'success');
      const list = this.data.filteredList.map(d => {
        if (d.id === id) {
          return { ...d, stock: stock, editingStock: stock, status: status };
        }
        return d;
      });
      this.setData({ filteredList: list });
    }).catch(err => {
      wx.hideLoading();
      util.toast('保存失败：' + err.message);
    });
  },

  restockAll() {
    const selectedIds = this.data.selectedIds;
    if (selectedIds.length === 0) {
      util.toast('请先勾选要补货的菜品');
      return;
    }
    util.confirm('确定把选中的 ' + selectedIds.length + ' 个菜品库存重置为 999 吗？', '批量补货').then(ok => {
      if (!ok) return;
      wx.showLoading({ title: '补货中...' });
      const tasks = selectedIds.map(id =>
        api.saveDish({ id, shopId: app.globalData.shopId, stock: 999 })
      );
      Promise.all(tasks).then(() => {
        wx.hideLoading();
        util.toast('已补货 ' + selectedIds.length + ' 个菜品', 'success');
        this.setData({ selectedIds: [] });
        this.load();
      }).catch(err => {
        wx.hideLoading();
        util.toast('补货失败：' + err.message);
      });
    });
  }
});
