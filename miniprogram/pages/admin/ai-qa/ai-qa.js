const api = require('../../../utils/request');
const app = getApp();

Page({
  data: {
    shopId: 1,
    list: [],
    dialogVisible: false,
    editId: null,
    formQuestion: '',
    formAnswer: '',
    generating: false,
    deduping: false,
    multiMode: false,
    selectedIds: {},
    selectedCount: 0,
    allChecked: false
  },

  onLoad() {
    this.setData({ shopId: app.globalData.shopId });
    this.loadList();
  },

  onShow() {
    this.loadList();
  },

  /** 加载列表 */
  loadList() {
    api.getAiQaList(this.data.shopId).then(list => {
      this.setData({ list: list || [] });
    });
  },

  /** 打开新增弹窗 */
  openAdd() {
    this.setData({
      dialogVisible: true,
      editId: null,
      formQuestion: '',
      formAnswer: ''
    });
  },

  /** 打开编辑弹窗 */
  openEdit(e) {
    const { id, q, a } = e.currentTarget.dataset;
    this.setData({
      dialogVisible: true,
      editId: id,
      formQuestion: q,
      formAnswer: a
    });
  },

  /** 关闭弹窗 */
  closeDialog() {
    this.setData({ dialogVisible: false });
  },

  noop() {},

  onQInput(e) { this.setData({ formQuestion: e.detail.value }); },
  onAInput(e) { this.setData({ formAnswer: e.detail.value }); },

  /** 保存（新增或修改） */
  onSave() {
    const { shopId, editId, formQuestion, formAnswer } = this.data;
    if (!formQuestion.trim() || !formAnswer.trim()) {
      wx.showToast({ title: '请填写完整', icon: 'none' });
      return;
    }
    const data = { shopId, question: formQuestion.trim(), answer: formAnswer.trim(), status: 1 };
    if (editId) data.id = editId;

    const req = editId ? api.updateAiQa(data) : api.addAiQa(data);
    req.then(() => {
      wx.showToast({ title: '已保存', icon: 'success' });
      this.setData({ dialogVisible: false });
      this.loadList();
    }).catch(() => {
      wx.showToast({ title: '保存失败', icon: 'none' });
    });
  },

  /** 删除 */
  onDelete(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认删除',
      content: '这条问题删掉后AI就不会回答了',
      success: (res) => {
        if (res.confirm) {
          api.deleteAiQa(id).then(() => {
            wx.showToast({ title: '已删除', icon: 'success' });
            this.loadList();
          });
        }
      }
    });
  },

  /** AI一键生成FAQ */
  onGenerate() {
    if (this.data.generating) return;
    wx.showModal({
      title: 'AI自动生成',
      content: 'AI会根据菜品菜单生成新的常见问题（自动去重，不会和已有重复），可能需要10-20秒，继续吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({ generating: true });
          api.generateAiQa(this.data.shopId).then(count => {
            wx.showToast({ title: '成功生成' + count + '条', icon: 'success' });
            this.setData({ generating: false });
            this.loadList();
          }).catch(err => {
            const msg = err.message || '生成失败';
            if (msg.includes('饱和')) {
              wx.showModal({
                title: '问题基本饱和',
                content: '已经想不出新问题了，你可以手动添加补充',
                showCancel: false
              });
            } else {
              wx.showToast({ title: msg, icon: 'none' });
            }
            this.setData({ generating: false });
          });
        }
      }
    });
  },

  // ==================== AI智能去重 ====================

  onDedup() {
    if (this.data.deduping) return;
    wx.showModal({
      title: 'AI智能去重',
      content: 'AI会自动找出意思重复、相近的问题，删掉多余的，保留最早的一条。可能需要10-20秒，继续吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({ deduping: true });
          api.dedupAiQa(this.data.shopId).then(count => {
            wx.showToast({ title: '删除了' + count + '条重复问题', icon: 'success' });
            this.setData({ deduping: false });
            this.loadList();
          }).catch(err => {
            wx.showToast({ title: err.message || '去重失败', icon: 'none' });
            this.setData({ deduping: false });
          });
        }
      }
    });
  },

  // ==================== 多选批量删除 ====================

  /** 切换多选模式 */
  toggleMulti() {
    this.setData({
      multiMode: !this.data.multiMode,
      selectedIds: {},
      selectedCount: 0,
      allChecked: false
    });
  },

  /** 勾选/取消勾选某条 */
  toggleSelect(e) {
    const id = e.currentTarget.dataset.id;
    const selectedIds = { ...this.data.selectedIds };
    if (selectedIds[id]) {
      delete selectedIds[id];
    } else {
      selectedIds[id] = true;
    }
    const count = Object.keys(selectedIds).length;
    this.setData({
      selectedIds,
      selectedCount: count,
      allChecked: count === this.data.list.length && this.data.list.length > 0
    });
  },

  /** 全选/取消全选 */
  toggleAll() {
    if (this.data.allChecked) {
      this.setData({ selectedIds: {}, selectedCount: 0, allChecked: false });
    } else {
      const selectedIds = {};
      this.data.list.forEach(item => { selectedIds[item.id] = true; });
      this.setData({ selectedIds, selectedCount: this.data.list.length, allChecked: true });
    }
  },

  /** 批量删除 */
  onBatchDelete() {
    const ids = Object.keys(this.data.selectedIds);
    if (ids.length === 0) return;
    wx.showModal({
      title: '批量删除',
      content: '确定删除选中的' + ids.length + '条吗？',
      success: (res) => {
        if (res.confirm) {
          // 循环删除
          const promises = ids.map(id => api.deleteAiQa(id));
          Promise.all(promises).then(() => {
            wx.showToast({ title: '已删除', icon: 'success' });
            this.setData({ selectedIds: {}, selectedCount: 0, allChecked: false });
            this.loadList();
          });
        }
      }
    });
  }
});
