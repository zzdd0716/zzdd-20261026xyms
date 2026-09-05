/**
 * admin/dish-edit —— 菜品新增/编辑：基本信息 + 规格组（单选/多选/双拼）配置
 */
const api = require('../../../utils/request');
const util = require('../../../utils/util');
const app = getApp();

const GROUP_TYPE_NAMES = ['单选', '多选'];

Page({
  data: {
    categories: [],
    groupTypeNames: GROUP_TYPE_NAMES,
    cateIndex: 0,
    form: {
      id: null,
      name: '',
      categoryId: null,
      price: '',
      stock: '0',
      status: 1,
      image: '',
      description: '',
      specs: []
    },
    saving: false
  },

  onLoad(options) {
    this.loadCategories().then(() => {
      if (options.id) {
        this.loadDish(options.id);
      } else {
        // 新增：默认选中传入分类或第一个分类
        const cid = Number(options.categoryId) ||
          (this.data.categories[0] && this.data.categories[0].id) || null;
        this.setData({
          'form.categoryId': cid,
          cateIndex: this.cateIndexOf(cid)
        });
      }
    });
  },

  loadCategories() {
    return api.adminCategories(app.globalData.shopId).then(list => {
      this.setData({ categories: list || [] });
    }).catch(e => util.toast('分类加载失败：' + e.message));
  },

  cateIndexOf(cid) {
    const idx = this.data.categories.findIndex(c => c.id === cid);
    return idx < 0 ? 0 : idx;
  },

  loadDish(id) {
    api.adminDishes(app.globalData.shopId).then(list => {
      const d = (list || []).find(x => x.id === Number(id));
      if (!d) {
        util.toast('未找到该菜品');
        return;
      }
      this.setData({
        form: {
          id: d.id,
          name: d.name || '',
          categoryId: d.categoryId,
          price: d.price != null ? String(d.price) : '',
          stock: d.stock != null ? String(d.stock) : '0',
          status: d.status != null ? d.status : 1,
          image: d.image || '',
          description: d.description || '',
          specs: (d.specs || []).map(g => ({
            id: g.id,
            name: g.name || '',
            type: g.type || 1,
            required: g.required || 0,
            minSelect: g.minSelect != null ? g.minSelect : 1,
            maxSelect: g.maxSelect != null ? g.maxSelect : 1,
            sortOrder: g.sortOrder,
            status: g.status != null ? g.status : 1,
            options: (g.options || []).map(o => ({
              id: o.id,
              name: o.name || '',
              priceDelta: o.priceDelta != null ? String(o.priceDelta) : '0',
              sortOrder: o.sortOrder,
              dishId: o.dishId || null,
              status: o.status != null ? o.status : 1
            }))
          }))
        },
        cateIndex: this.cateIndexOf(d.categoryId)
      });
    }).catch(e => util.toast('菜品加载失败：' + e.message));
  },

  // ===== 基本信息 =====
  onInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ ['form.' + field]: e.detail.value });
  },

  onCateChange(e) {
    const c = this.data.categories[Number(e.detail.value)];
    if (c) {
      this.setData({ 'form.categoryId': c.id, cateIndex: Number(e.detail.value) });
    }
  },

  toggleStatus(e) {
    this.setData({ 'form.status': e.detail.value ? 1 : 0 });
  },

  // ===== 规格组 =====
  addGroup() {
    const specs = this.data.form.specs;
    specs.push({
      name: '',
      type: 2,
      required: 0,
      minSelect: 0,
      maxSelect: 99,
      sortOrder: specs.length + 1,
      status: 1,
      options: []
    });
    this.setData({ 'form.specs': specs });
  },

  removeGroup(e) {
    const idx = e.currentTarget.dataset.idx;
    const g = this.data.form.specs[idx];
    util.confirm('确定删除规格组「' + (g.name || '未命名') + '」吗？').then(ok => {
      if (!ok) return;
      const specs = this.data.form.specs;
      specs.splice(idx, 1);
      this.setData({ 'form.specs': specs });
    });
  },

  onGroupInput(e) {
    const { idx, field } = e.currentTarget.dataset;
    this.setData({ ['form.specs[' + idx + '].' + field]: e.detail.value });
  },

  onGroupTypeChange(e) {
    const idx = Number(e.currentTarget.dataset.idx);
    const type = Number(e.detail.value) + 1;
    const patch = { ['form.specs[' + idx + '].type']: type };
    if (type === 1) {
      patch['form.specs[' + idx + '].minSelect'] = 1;
      patch['form.specs[' + idx + '].maxSelect'] = 1;
    }
    this.setData(patch);
  },

  toggleGroupRequired(e) {
    const idx = e.currentTarget.dataset.idx;
    this.setData({ ['form.specs[' + idx + '].required']: e.detail.value ? 1 : 0 });
  },

  onGroupMaxSelectInput(e) {
    const idx = e.currentTarget.dataset.idx;
    const val = Math.max(1, Number(e.detail.value) || 1);
    this.setData({ ['form.specs[' + idx + '].maxSelect']: val });
  },

  // ===== 规格选项 =====
  addOption(e) {
    const idx = e.currentTarget.dataset.idx;
    const specs = this.data.form.specs;
    const g = specs[idx];
    g.options.push({
      name: '',
      priceDelta: '0',
      sortOrder: g.options.length + 1,
      dishId: null,
      status: 1
    });
    this.setData({ ['form.specs[' + idx + '].options']: g.options });
  },

  removeOption(e) {
    const { idx, oidx } = e.currentTarget.dataset;
    const g = this.data.form.specs[idx];
    g.options.splice(oidx, 1);
    this.setData({ ['form.specs[' + idx + '].options']: g.options });
  },

  onOptionInput(e) {
    const { idx, oidx, field } = e.currentTarget.dataset;
    this.setData({
      ['form.specs[' + idx + '].options[' + oidx + '].' + field]: e.detail.value
    });
  },

  // ===== 保存 =====
  save() {
    const f = this.data.form;
    if (!f.name || !f.name.trim()) {
      util.toast('请填写菜品名称');
      return;
    }
    if (!f.price || Number(f.price) <= 0) {
      util.toast('请填写正确的价格');
      return;
    }
    if (!f.categoryId) {
      util.toast('请选择分类');
      return;
    }
    for (const g of f.specs) {
      if (!g.name || !g.name.trim()) {
        util.toast('规格组名称不能为空');
        return;
      }
      for (const o of g.options) {
        if (!o.name || !o.name.trim()) {
          util.toast('规格「' + g.name + '」存在空选项名');
          return;
        }
      }
    }

    this.setData({ saving: true });
    const payload = {
      id: f.id || undefined,
      shopId: app.globalData.shopId,
      name: f.name,
      categoryId: f.categoryId,
      price: Number(f.price),
      stock: Number(f.stock) || 0,
      status: f.status,
      image: f.image,
      description: f.description,
      specs: f.specs.map(g => ({
        name: g.name,
        type: g.type,
        required: g.required,
        minSelect: g.minSelect,
        maxSelect: g.maxSelect,
        sortOrder: g.sortOrder,
        status: g.status,
        options: g.options.map(o => ({
          name: o.name,
          priceDelta: Number(o.priceDelta) || 0,
          sortOrder: o.sortOrder,
          dishId: o.dishId || null,
          status: o.status
        }))
      }))
    };

    api.saveDish(payload).then(() => {
      util.toast(f.id ? '菜品已更新' : '菜品已新增', 'success');
      setTimeout(() => wx.navigateBack(), 600);
    }).catch(e => {
      this.setData({ saving: false });
      util.toast('保存失败：' + e.message);
    });
  }
});
