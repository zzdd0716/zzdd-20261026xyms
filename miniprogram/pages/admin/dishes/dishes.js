/**
 * admin/dishes —— 菜品管理：分类筛选 + 上下架 + 编辑/删除 + 新增
 */
const api = require('../../../utils/request');
const util = require('../../../utils/util');
const app = getApp();

Page({
  data: {
    categories: [],
    activeCate: null,
    dishes: [],
    loading: true,
    // 搜索与价格排序
    keyword: '',
    priceSort: '', // '' 默认 / asc 低到高 / desc 高到低
    // 视图预计算（WXML 不能调用 js 方法）
    filteredList: [],
    priceSortText: '价格排序'
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
      if (cats.length && this.data.activeCate === null) {
        patch.activeCate = cats[0].id;
      }
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
    const id = e.currentTarget.dataset.id;
    this.setData({ activeCate: (id === null || id === undefined || id === 'null') ? null : id });
    this.refreshView();
  },

  onKeywordInput(e) {
    this.setData({ keyword: e.detail.value });
    this.refreshView();
  },

  /** 价格排序循环切换：默认 → 低到高 → 高到低 → 默认 */
  togglePriceSort() {
    const cur = this.data.priceSort;
    const next = cur === '' ? 'asc' : (cur === 'asc' ? 'desc' : '');
    const text = next === 'asc' ? '价格 ▲' : (next === 'desc' ? '价格 ▼' : '价格排序');
    this.setData({ priceSort: next, priceSortText: text });
    this.refreshView();
  },

  /** 视图预计算：分类 + 关键字 + 价格排序，每项带 cateName（WXML 不能调用 js 方法） */
  refreshView() {
    const { activeCate, dishes, keyword, priceSort, categories } = this.data;
    let list = dishes || [];
    if (activeCate !== null) {
      list = list.filter(d => d.categoryId === activeCate);
    }
    const kw = (keyword || '').trim().toLowerCase();
    if (kw) {
      list = list.filter(d =>
        (d.name || '').toLowerCase().includes(kw) ||
        (d.description || '').toLowerCase().includes(kw)
      );
    }
    if (priceSort === 'asc') {
      list = list.slice().sort((a, b) => Number(a.price) - Number(b.price));
    } else if (priceSort === 'desc') {
      list = list.slice().sort((a, b) => Number(b.price) - Number(a.price));
    }
    const cateMap = {};
    (categories || []).forEach(c => { cateMap[c.id] = c.name; });
    const filteredList = list.map(d => ({
      ...d,
      cateName: cateMap[d.categoryId] || '未分类'
    }));
    this.setData({ filteredList });
  },

  /** 上下架 */
  toggleStatus(e) {
    const { id, status } = e.currentTarget.dataset;
    const target = status === 1 ? 0 : 1;
    api.saveDish({ id, shopId: app.globalData.shopId, status: target }).then(() => {
      util.toast(target === 1 ? '已上架' : '已下架', 'success');
      this.load();
    }).catch(err => util.toast('操作失败：' + err.message));
  },

  /** 编辑菜品 */
  editDish(e) {
    wx.navigateTo({ url: '/pages/admin/dish-edit/dish-edit?id=' + e.currentTarget.dataset.id });
  },

  /** 新增菜品（默认选中当前分类） */
  addDish() {
    const cateId = this.data.activeCate || (this.data.categories[0] && this.data.categories[0].id) || '';
    wx.navigateTo({ url: '/pages/admin/dish-edit/dish-edit?categoryId=' + cateId });
  },

  /** 估清下架 / 重新上架 */
  goClearance() {
    wx.navigateTo({ url: '/pages/admin/clearance/clearance' });
  },

  /** 删除菜品 */
  deleteDish(e) {
    const { id, name } = e.currentTarget.dataset;
    util.confirm('确定删除菜品「' + name + '」吗？', '删除确认').then(ok => {
      if (!ok) return;
      api.deleteDish(id).then(() => {
        util.toast('已删除', 'success');
        this.load();
      }).catch(err => util.toast('操作失败：' + err.message));
    });
  }
});
