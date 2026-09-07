/**
 * menu —— 点餐页：分类导航 + 菜品列表 + 选规格 + 底部购物车栏
 */
const api = require('../../utils/request');
const util = require('../../utils/util');
const app = getApp();

Page({
  data: {
    categories: [],
    activeCate: null,
    dishes: [],
    loading: true,
    // 视图预计算（WXML 不能调用 js 方法）
    filteredList: [],
    // 搜索关键字
    keyword: '',
    // 购物车
    cart: {},
    cartList: [],
    cartCount: 0,
    cartTotal: 0,
    // 每个菜品的已选数量（展示用）
    cartQtyMap: {},
    // 规格弹窗
    specVisible: false,
    specDish: null,
    // 购物车明细弹窗
    cartPopupVisible: false,
    // 桌号
    tableNo: ''
  },

  onLoad() {
    this.loadMenu();
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 });
    }
    // 每次回到本页同步购物车角标、桌号，并刷新菜单（估清下架后及时生效）
    this.setData({ tableNo: app.globalData.tableNo });
    this.refreshCart();
    this.loadMenu();
  },

  /** 下拉刷新菜单 */
  onPullDownRefresh() {
    this.loadMenu();
    setTimeout(() => wx.stopPullDownRefresh(), 800);
  },

  loadMenu() {
    const shopId = app.globalData.shopId;
    this.setData({ loading: true });
    Promise.all([
      api.listCategories(shopId),
      api.listDishes(shopId)
    ]).then(([cats, dishes]) => {
      const patch = { categories: cats, dishes, loading: false };
      if (cats.length && this.data.activeCate === null) {
        patch.activeCate = cats[0].id;
      }
      this.setData(patch);
      this.refreshView();
    }).catch(e => {
      this.setData({ loading: false });
      util.toast('菜单加载失败：' + e.message);
    });
  },

  switchCate(e) {
    this.setData({ activeCate: e.currentTarget.dataset.id });
    this.refreshView();
  },

  /** 视图预计算：当前分类下的菜品；有关键字时跨分类搜索（WXML 不能调用 js 方法） */
  refreshView() {
    const { activeCate, dishes, keyword } = this.data;
    const kw = (keyword || '').trim().toLowerCase();
    let list = dishes || [];
    if (kw) {
      // 搜索模式：跨分类，匹配菜名或描述
      list = list.filter(d =>
        (d.name || '').toLowerCase().includes(kw) ||
        (d.description || '').toLowerCase().includes(kw)
      );
    } else if (activeCate !== null) {
      list = list.filter(d => d.categoryId === activeCate);
    }
    this.setData({ filteredList: list });
  },

  /** 搜索输入 */
  onKeywordInput(e) {
    this.setData({ keyword: e.detail.value });
    this.refreshView();
  },

  /** 清空搜索 */
  clearKeyword() {
    this.setData({ keyword: '' });
    this.refreshView();
  },

  /** 同步购物车数据（角标、金额、每个菜品的已选数） */
  refreshCart() {
    const cart = app.getCart();
    const c = app.calcCart(cart);
    const cartQtyMap = {};
    Object.keys(cart).forEach(k => {
      const item = cart[k];
      cartQtyMap[item.id] = (cartQtyMap[item.id] || 0) + (Number(item.qty) || 0);
    });
    // 对象转数组，避免 wx:for 遍历对象时 key 含特殊字符导致渲染崩溃
    const cartList = Object.keys(cart).map(k => cart[k]);
    this.setData({
      cart,
      cartList,
      cartCount: c.count,
      cartTotal: c.total,
      cartQtyMap
    });
  },

  openSpec(e) {
    const id = e.currentTarget.dataset.id;
    const dish = this.data.dishes.find(d => d.id === id);
    if (!dish) return;
    this.setData({ specDish: dish, specVisible: true });
  },

  /** 规格弹窗确认：写入购物车并持久化 */
  onSpecConfirm(e) {
    const item = e.detail;
    const cart = app.getCart();
    if (cart[item.key]) {
      cart[item.key].qty += item.qty;
      if (item.remark) cart[item.key].remark = item.remark;
    } else {
      cart[item.key] = item;
    }
    app.saveCart(cart);
    this.setData({ specVisible: false, specDish: null });
    this.refreshCart();
  },

  onSpecClose() {
    this.setData({ specVisible: false, specDish: null });
  },

  /** 阻止冒泡占位 */
  noop() {},

  /** 点击购物车挂件：空车提示，否则展开明细弹窗 */
  goCart() {
    if (this.data.cartCount <= 0) {
      util.toast('购物车是空的，先选点菜品吧');
      return;
    }
    this.setData({ cartPopupVisible: !this.data.cartPopupVisible });
  },

  closeCartPopup() {
    this.setData({ cartPopupVisible: false });
  },

  /** 购物车明细：加数量 */
  cartItemInc(e) {
    const key = e.currentTarget.dataset.key;
    const cart = app.getCart();
    if (cart[key]) {
      cart[key].qty += 1;
      app.saveCart(cart);
      this.refreshCart();
    }
  },

  /** 购物车明细：减数量（减到0删除） */
  cartItemDec(e) {
    const key = e.currentTarget.dataset.key;
    const cart = app.getCart();
    if (cart[key]) {
      cart[key].qty -= 1;
      if (cart[key].qty <= 0) {
        delete cart[key];
      }
      app.saveCart(cart);
      this.refreshCart();
      // 如果购物车空了，关闭弹窗
      if (Object.keys(cart).length === 0) {
        this.setData({ cartPopupVisible: false });
      }
    }
  },

  /** 购物车明细：修改备注 */
  onCartRemarkInput(e) {
    const key = e.currentTarget.dataset.key;
    const value = e.detail.value;
    const cart = app.getCart();
    if (cart[key]) {
      cart[key].remark = value;
      app.saveCart(cart);
      this.refreshCart();
    }
  },

  /** 清空购物车 */
  clearCart() {
    wx.showModal({
      title: '提示',
      content: '确定清空购物车吗？',
      success: (res) => {
        if (res.confirm) {
          app.saveCart({});
          this.refreshCart();
          this.setData({ cartPopupVisible: false });
        }
      }
    });
  },

  /** 去结算：跳转购物车页 */
  goCheckout() {
    this.setData({ cartPopupVisible: false });
    wx.switchTab({ url: '/pages/cart/cart' });
  }
});
