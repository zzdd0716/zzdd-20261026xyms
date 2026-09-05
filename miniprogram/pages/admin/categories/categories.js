/**
 * admin/categories —— 分类管理：列表 + 新增/编辑/启停/删除
 */
const api = require('../../../utils/request');
const util = require('../../../utils/util');
const app = getApp();

Page({
  data: {
    categories: [],
    loading: true,
    // 弹窗表单
    dialogVisible: false,
    form: { id: null, name: '', sortOrder: 1, status: 1 },
    saving: false
  },

  onShow() {
    this.load();
  },

  load() {
    api.adminCategories(app.globalData.shopId).then(list => {
      this.setData({ categories: list || [], loading: false });
    }).catch(e => {
      this.setData({ loading: false });
      util.toast('加载失败：' + e.message);
    });
  },

  openAdd() {
    this.setData({
      dialogVisible: true,
      form: { id: null, name: '', sortOrder: this.data.categories.length + 1, status: 1 }
    });
  },

  openEdit(e) {
    const c = e.currentTarget.dataset.item;
    this.setData({
      dialogVisible: true,
      form: { id: c.id, name: c.name, sortOrder: c.sortOrder, status: c.status }
    });
  },

  closeDialog() {
    this.setData({ dialogVisible: false });
  },

  onNameInput(e) {
    this.setData({ 'form.name': e.detail.value });
  },
  onSortInput(e) {
    this.setData({ 'form.sortOrder': e.detail.value });
  },

  /** 阻止弹窗冒泡 */
  noop() {},
  toggleStatus(e) {
    this.setData({ 'form.status': e.detail.value ? 1 : 0 });
  },

  save() {
    const f = this.data.form;
    if (!f.name || !f.name.trim()) {
      util.toast('请填写分类名称');
      return;
    }
    this.setData({ saving: true });
    api.saveCategory({
      id: f.id || undefined,
      shopId: app.globalData.shopId,
      name: f.name,
      sortOrder: Number(f.sortOrder) || 1,
      status: f.status
    }).then(() => {
      util.toast(f.id ? '分类已更新' : '分类已新增', 'success');
      this.setData({ dialogVisible: false, saving: false });
      this.load();
    }).catch(e => {
      this.setData({ saving: false });
      util.toast('保存失败：' + e.message);
    });
  },

  /** 列表内快捷启停 */
  toggleRowStatus(e) {
    const { id, status } = e.currentTarget.dataset;
    const target = status === 1 ? 0 : 1;
    api.saveCategory({ id, shopId: app.globalData.shopId, status: target }).then(() => {
      util.toast(target === 1 ? '已启用' : '已停用', 'success');
      this.load();
    }).catch(err => util.toast('操作失败：' + err.message));
  },

  remove(e) {
    const { id, name } = e.currentTarget.dataset;
    util.confirm('确定删除分类「' + name + '」吗？', '删除确认').then(ok => {
      if (!ok) return;
      api.deleteCategory(id).then(() => {
        util.toast('已删除', 'success');
        this.load();
      }).catch(err => util.toast('操作失败：' + err.message));
    });
  }
});
