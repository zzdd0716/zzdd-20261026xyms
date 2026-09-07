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
    allSelected: false,
    selectedSpecIds: [],
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
      selectedIds: [],
      selectedSpecIds: [],
      allSelected: false
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
    this.setData({ categoryId: (id === null || id === undefined || id === 'null' || id === 'all') ? null : id });
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
    let selectedSpecIds = this.data.selectedSpecIds.slice();
    if (idx >= 0) {
      selectedIds.splice(idx, 1);
      // 取消勾选菜品：移除该菜品关联的规格项勾选
      if (this.data.mode === 'up') {
        const relatedOptIds = this.getRelatedSpecIds([id]);
        selectedSpecIds = selectedSpecIds.filter(x => relatedOptIds.indexOf(x) < 0);
      }
    } else {
      selectedIds.push(id);
      // 勾选菜品：自动勾选该菜品关联的已停用规格项
      if (this.data.mode === 'up') {
        const relatedOptIds = this.getRelatedSpecIds([id]);
        relatedOptIds.forEach(oid => {
          if (selectedSpecIds.indexOf(oid) < 0) selectedSpecIds.push(oid);
        });
      }
    }
    this.setData({ selectedIds, selectedSpecIds });
    this.refreshView();
  },

  /** 获取与指定菜品关联的所有已停用规格项ID */
  getRelatedSpecIds(dishIds) {
    const dishNames = this.data.dishes
      .filter(d => dishIds.indexOf(d.id) >= 0)
      .map(d => (d.name || '').trim())
      .filter(Boolean);
    const ids = [];
    this.data.dishes.forEach(parent => {
      (parent.specs || []).forEach(g => {
        (g.options || []).forEach(o => {
          if (o.status === 0 && this.specMatches(o, dishIds, dishNames)) {
            ids.push(o.id);
          }
        });
      });
    });
    return ids;
  },

  /** 全选/取消全选（当前筛选结果） */
  toggleSelectAll() {
    if (this.data.allSelected) {
      this.setData({ selectedIds: [], selectedSpecIds: [], allSelected: false });
    } else {
      const ids = this.data.matchedList.map(d => d.id);
      let selectedSpecIds = this.data.selectedSpecIds.slice();
      if (this.data.mode === 'up') {
        const relatedOptIds = this.getRelatedSpecIds(ids);
        relatedOptIds.forEach(oid => {
          if (selectedSpecIds.indexOf(oid) < 0) selectedSpecIds.push(oid);
        });
      }
      this.setData({ selectedIds: ids, selectedSpecIds, allSelected: true });
    }
    this.refreshView();
  },

  /** 勾选/取消单个规格项 */
  toggleSpec(e) {
    const optId = e.currentTarget.dataset.optId;
    const selectedSpecIds = this.data.selectedSpecIds.slice();
    const idx = selectedSpecIds.indexOf(optId);
    if (idx >= 0) {
      selectedSpecIds.splice(idx, 1);
    } else {
      selectedSpecIds.push(optId);
    }
    this.setData({ selectedSpecIds });
    this.refreshView();
  },

  /** 仅恢复选中的规格项（不上架菜品） */
  async restoreSelectedSpecs() {
    if (this.data.running) return;
    if (this.data.selectedSpecIds.length === 0) {
      wx.showToast({ title: '请先勾选要恢复的规格项', icon: 'none' });
      return;
    }
    this.setData({ running: true });
    try {
      await api.updateSpecOptionsStatus(this.data.selectedSpecIds, 1);
      wx.showToast({ title: '已恢复 ' + this.data.selectedSpecIds.length + ' 项规格', icon: 'success' });
      this.setData({ selectedSpecIds: [] });
      await this.loadData();
    } catch (err) {
      console.error('恢复规格失败:', err);
      wx.showToast({ title: err.message || '恢复失败', icon: 'none', duration: 3000 });
    } finally {
      this.setData({ running: false });
    }
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
    // 给规格项打 selected 标记
    const selSpecIds = this.data.selectedSpecIds;
    relatedList.forEach(ch => {
      ch.matches.forEach(m => {
        m.selected = selSpecIds.indexOf(m.option.id) >= 0;
      });
    });
    const specCountNum = this.specCount();
    const actionCountNum = this.actionCount();
    // 更新全选状态：当前筛选结果全部被选中时为 true
    const allSelected = matchedList.length > 0 && matchedList.every(d => selectedIds.indexOf(d.id) >= 0);
    this.setData({ matchedList, relatedList, specCountNum, actionCountNum, allSelected });
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

  /** 关联规格项变更列表：[{dish, matches:[{group, option}]}]
   *  下架模式：只显示勾选菜品关联的、当前启用的规格项
   *  上架模式：显示所有已停用的规格项（不依赖勾选菜品，可独立恢复）
   */
  relatedChanges() {
    const isUp = this.data.mode === 'up';
    const selectedIds = this.data.selectedIds;
    // 下架模式：未勾选菜品时不显示
    if (!isUp && !selectedIds.length) return [];
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
          if (isUp) {
            // 上架模式：显示所有已停用的规格项
            if (o.status === 0) {
              matches.push({ group: g, option: o });
            }
          } else {
            // 下架模式：只显示勾选菜品关联的、当前启用的规格项
            if (this.specMatches(o, selectedIds, selectedNames) && o.status === currentStatus) {
              matches.push({ group: g, option: o });
            }
          }
        });
      });
      if (matches.length > 0) {
        changes.push({
          dishId: parent.id,
          dish: parent,
          matches: matches.map(m => ({ ...m, optId: m.option.id }))
        });
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
    // 上架模式下，一键上架的规格项只算勾选菜品关联的（不算所有已停用的）
    let specCount = 0;
    if (this.data.mode === 'down' || selectedIds.length > 0) {
      const selectedNames = this.data.dishes
        .filter(d => selectedIds.indexOf(d.id) >= 0)
        .map(d => (d.name || '').trim())
        .filter(Boolean);
      this.data.dishes.forEach(parent => {
        (parent.specs || []).forEach(g => {
          (g.options || []).forEach(o => {
            if (this.specMatches(o, selectedIds, selectedNames) && o.status === currentStatus) {
              specCount += 1;
            }
          });
        });
      });
    }
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

    // 2. 下架/上架选中的菜品（后端会自动联动处理关联规格项）
    for (const d of this.data.dishes) {
      if (selectedIds.indexOf(d.id) >= 0 && d.status === currentStatus) {
        await api.saveDish({ id: d.id, status: nextStatus });
      }
    }
  }
});
