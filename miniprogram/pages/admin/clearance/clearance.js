/**
 * admin/clearance —— 估清下架 / 重新上架
 *
 * 与网页版商家后台逻辑一致：
 * - 下架模式：在上架菜品中按关键字/分类筛选，勾选后一键下架；同时自动停用其他菜品
 *   规格配置中关联到这些菜品的规格项（选项名包含菜品名 / 选项关联菜品 / 名称后缀匹配）
 * - 重新上架模式：找回已下架菜品（可按分类名搜索），恢复菜品、所属分类及关联规格项
 */
const api = require('../../../utils/request');
const util = require('../../../utils/util');
const app = getApp();

Page({
  data: {
    mode: 'down', // down=估清下架  up=重新上架
    keyword: '',
    categoryId: null,
    categories: [],
    dishes: [],
    selectedIds: [],
    loading: true,
    running: false,
    // ===== 视图预计算（WXML 不能调用 js 方法） =====
    matchedList: [],   // 命中菜品（每项带 selected、cateName）
    relatedList: [],   // 关联规格项变更 [{dish, matches:[{group, option}]}]
    specCountNum: 0,   // 关联规格项总数
    actionCountNum: 0  // 一键操作总动作数
  },

  onLoad() {
    this.loadData();
  },

  loadData() {
    const shopId = app.globalData.shopId;
    this.setData({ loading: true });
    Promise.all([
      api.adminCategories(shopId),
      api.adminDishes(shopId)
    ]).then(([cats, dishes]) => {
      this.setData({ categories: cats || [], dishes: dishes || [], loading: false });
      this.refreshView();
    }).catch(e => {
      this.setData({ loading: false });
      util.toast('加载失败：' + e.message);
    });
  },

  // ===== 模式与筛选 =====
  switchMode(e) {
    this.setData({
      mode: e.currentTarget.dataset.mode,
      keyword: '',
      categoryId: null,
      selectedIds: []
    });
    this.refreshView();
  },

  onKeywordInput(e) {
    this.setData({ keyword: e.detail.value });
    this.pruneSelected();
    this.refreshView();
  },

  switchCate(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ categoryId: (id === null || id === undefined || id === 'null') ? null : id });
    this.pruneSelected();
    this.refreshView();
  },

  /** 当前可操作状态：下架=处理上架中(status1)，上架=处理已下架(status0) */
  currentStatus() {
    return this.data.mode === 'down' ? 1 : 0;
  },

  nextStatus() {
    return this.data.mode === 'down' ? 0 : 1;
  },

  cateName(id) {
    const c = this.data.categories.find(x => x.id === id);
    return c ? c.name : '未分类';
  },

  /** 关键字/分类命中的菜品（仅当前可操作状态） */
  matchedDishes() {
    const kw = (this.data.keyword || '').trim().toLowerCase();
    const target = this.currentStatus();
    let list = this.data.dishes.filter(d => d.status === target);
    if (this.data.categoryId) {
      list = list.filter(d => d.categoryId === this.data.categoryId);
    }
    if (!kw) return list;
    return list.filter(d => {
      const dishHit = (d.name || '').toLowerCase().includes(kw) ||
        (d.description || '').toLowerCase().includes(kw);
      if (!dishHit && this.data.mode === 'up') {
        // 重新上架模式支持按分类名搜索
        const c = this.data.categories.find(x => x.id === d.categoryId);
        if (c && (c.name || '').toLowerCase().includes(kw)) return true;
      }
      return dishHit;
    });
  },

  isSelected(id) {
    return this.data.selectedIds.indexOf(id) >= 0;
  },

  toggleDish(e) {
    const id = e.currentTarget.dataset.id;
    const selectedIds = this.data.selectedIds.slice();
    const idx = selectedIds.indexOf(id);
    if (idx >= 0) {
      selectedIds.splice(idx, 1);
    } else {
      selectedIds.push(id);
    }
    this.setData({ selectedIds });
    this.refreshView();
  },

  /** 筛选变化后，移除已不在命中列表中的选中项 */
  pruneSelected() {
    const visible = this.matchedDishes().map(d => d.id);
    const selectedIds = this.data.selectedIds.filter(id => visible.indexOf(id) >= 0);
    this.setData({ selectedIds });
  },

  /** 视图预计算：把 WXML 需要的派生数据写入 data（WXML 不能调用 js 方法） */
  refreshView() {
    const matched = this.matchedDishes();
    const selectedIds = this.data.selectedIds;
    const matchedList = matched.map(d => ({
      ...d,
      selected: selectedIds.indexOf(d.id) >= 0,
      cateName: this.cateName(d.categoryId)
    }));
    const relatedList = this.relatedChanges();
    const specCountNum = this.specCount();
    const actionCountNum = this.actionCount();
    this.setData({ matchedList, relatedList, specCountNum, actionCountNum });
  },

  // ===== 关联规格项计算 =====
  /** 规格项是否与选中的菜品关联（命中任一方向即算） */
  specMatches(option, selectedIds, selectedNames) {
    if (!option) return false;
    // 方向1：规格项显式关联了选中的菜品（双拼选项可关联菜品）
    const linked = option.dishId !== null && option.dishId !== undefined &&
      selectedIds.indexOf(option.dishId) >= 0;
    // 方向2/3：选项名与菜品名匹配（如选项"白切鸡饭"匹配菜品"白切鸡"）
    const optName = (option.name || '').toLowerCase();
    const named = selectedNames.some(n => {
      if (!n) return false;
      const nl = n.toLowerCase();
      if (optName.includes(nl)) return true;
      // 菜品名去后缀（饭/面/粉/汤/粥/套餐）后的核心名以选项名结尾
      const core = nl.replace(/(饭|面|粉|汤|粥|套餐)$/, '');
      if (core.length > 0 && core.endsWith(optName)) return true;
      return false;
    });
    return linked || named;
  },

  /** 关联规格项变更列表：[{dish, matches:[{group, option}]}] */
  relatedChanges() {
    const selectedIds = this.data.selectedIds;
    if (!selectedIds.length) return [];
    const selectedNames = this.data.dishes
      .filter(d => selectedIds.indexOf(d.id) >= 0)
      .map(d => (d.name || '').trim())
      .filter(Boolean);
    const currentStatus = this.currentStatus();
    const changes = [];
    this.data.dishes.forEach(parent => {
      const matches = [];
      (parent.specs || []).forEach(g => {
        (g.options || []).forEach(o => {
          if (this.specMatches(o, selectedIds, selectedNames) && o.status === currentStatus) {
            matches.push({ group: g, option: o });
          }
        });
      });
      if (matches.length > 0) {
        changes.push({ dish: parent, matches });
      }
    });
    return changes;
  },

  /** 关联规格项数量 */
  specCount() {
    return this.relatedChanges().reduce((s, c) => s + c.matches.length, 0);
  },

  /** 一键操作总动作数：菜品 + 规格项 + （上架模式）分类 */
  actionCount() {
    const selectedIds = this.data.selectedIds;
    const currentStatus = this.currentStatus();
    const dishCount = this.data.dishes.filter(d =>
      selectedIds.indexOf(d.id) >= 0 && d.status === currentStatus).length;
    const specCount = this.specCount();
    let categoryCount = 0;
    if (this.data.mode === 'up' && dishCount > 0) {
      const categoryIds = new Set(
        this.data.dishes.filter(d => selectedIds.indexOf(d.id) >= 0).map(d => d.categoryId)
      );
      categoryIds.forEach(cid => {
        const c = this.data.categories.find(x => x.id === cid);
        if (c && c.status === 0) categoryCount += 1;
      });
    }
    return dishCount + specCount + categoryCount;
  },

  // ===== 一键执行 =====
  run() {
    const selectedIds = this.data.selectedIds;
    if (!selectedIds.length) {
      util.toast(this.data.mode === 'down' ? '请先选择要估清下架的菜品' : '请先选择要重新上架的菜品');
      return;
    }
    const currentStatus = this.currentStatus();
    const nextStatus = this.nextStatus();
    const isUp = this.data.mode === 'up';
    const changes = this.relatedChanges();

    const dishCount = this.data.dishes.filter(d =>
      selectedIds.indexOf(d.id) >= 0 && d.status === currentStatus).length;
    const specCount = this.specCount();
    const categoryIds = new Set(
      this.data.dishes.filter(d => selectedIds.indexOf(d.id) >= 0).map(d => d.categoryId)
    );
    const categoryCount = isUp
      ? [...categoryIds].filter(cid => {
          const c = this.data.categories.find(x => x.id === cid);
          return c && c.status === 0;
        }).length
      : 0;

    if (dishCount === 0 && specCount === 0 && categoryCount === 0) {
      util.toast(isUp ? '所选内容无需重新上架' : '所选内容无需下架');
      return;
    }

    const content = isUp
      ? '将重新上架 ' + dishCount + ' 道菜品、' + categoryCount + ' 个分类，并恢复 ' + specCount + ' 个关联规格项，是否继续？'
      : '将下架 ' + dishCount + ' 道菜品，并停用 ' + specCount + ' 个关联规格项，是否继续？';

    util.confirm(content, isUp ? '重新上架确认' : '估清下架确认').then(ok => {
      if (!ok) return;
      this.setData({ running: true });
      this.execute(selectedIds, currentStatus, nextStatus, isUp, changes, categoryIds)
        .then(() => {
          util.toast(isUp ? '重新上架完成' : '估清下架完成', 'success');
          this.setData({ running: false, selectedIds: [], keyword: '' });
          this.loadData();
        })
        .catch(e => {
          this.setData({ running: false });
          util.toast('操作失败：' + e.message);
        });
    });
  },

  async execute(selectedIds, currentStatus, nextStatus, isUp, changes, categoryIds) {
    const shopId = app.globalData.shopId;

    // 1. 上架模式：先恢复停用中的分类
    if (isUp) {
      for (const cid of categoryIds) {
        const c = this.data.categories.find(x => x.id === cid);
        if (c && c.status === 0) {
          await api.saveCategory({ id: cid, shopId, status: 1 });
        }
      }
    }

    // 2. 下架/上架选中的菜品
    for (const d of this.data.dishes) {
      if (selectedIds.indexOf(d.id) >= 0 && d.status === currentStatus) {
        await api.saveDish({ id: d.id, status: nextStatus });
      }
    }

    // 3. 处理关联规格项（含规格组状态联动）
    for (const change of changes) {
      const specs = JSON.parse(JSON.stringify(change.dish.specs || []));
      let dirty = false;
      for (const g of specs) {
        let activeOptionCount = 0;
        for (const o of (g.options || [])) {
          const hit = change.matches.some(m => m.option.id === o.id);
          if (hit && o.status === currentStatus) {
            o.status = nextStatus;
            dirty = true;
          }
          if (o.status === 1) activeOptionCount += 1;
        }
        // 组状态联动：下架时组内无启用选项→停用组；上架时组有启用选项→恢复组
        if (isUp && g.options && g.options.length > 0 && activeOptionCount > 0 && g.status === 0) {
          g.status = 1;
          dirty = true;
        } else if (!isUp && g.options && g.options.length > 0 && activeOptionCount === 0 && g.status === 1) {
          g.status = 0;
          dirty = true;
        }
      }
      if (dirty) {
        // 被估清/上架的菜品自己，status 用操作后的新值，避免覆盖第2步的状态变更
        const dishStatus = selectedIds.indexOf(change.dish.id) >= 0 ? nextStatus : change.dish.status;
        await api.saveDish({ id: change.dish.id, shopId, status: dishStatus, specs });
      }
    }
  }
});
