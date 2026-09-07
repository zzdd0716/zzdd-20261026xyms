/**
 * admin/tables —— 桌台管理：列表 + 新增/编辑/删除
 */
const api = require('../../../utils/request');
const util = require('../../../utils/util');
const config = require('../../../utils/config');
const app = getApp();

Page({
  data: {
    tables: [],
    loading: true,
    dialogVisible: false,
    form: { id: null, tableNo: '', seatCount: 4, status: 1 },
    saving: false,
    qrcodeVisible: false,
    qrcodeUrl: '',
    qrcodeTableNo: ''
  },

  onShow() {
    this.load();
  },

  load() {
    api.listTables(app.globalData.shopId).then(list => {
      const sorted = (list || []).slice().sort((a, b) =>
        String(a.tableNo).localeCompare(String(b.tableNo), undefined, { numeric: true, sensitivity: 'base' })
      );
      this.setData({ tables: sorted, loading: false });
    }).catch(e => {
      this.setData({ loading: false });
      util.toast('加载失败：' + e.message);
    });
  },

  openAdd() {
    this.setData({
      dialogVisible: true,
      form: { id: null, tableNo: '', seatCount: 4, status: 1 }
    });
  },

  openEdit(e) {
    const t = e.currentTarget.dataset.item;
    this.setData({
      dialogVisible: true,
      form: { id: t.id, tableNo: t.tableNo, seatCount: t.seatCount, status: t.status }
    });
  },

  closeDialog() {
    this.setData({ dialogVisible: false });
  },

  showQrcode(e) {
    const t = e.currentTarget.dataset.item;
    const url = config.BASE_URL + '/api/admin/table/qrcode?tableId=' + t.id + '&t=' + Date.now();
    this.setData({ qrcodeVisible: true, qrcodeUrl: url, qrcodeTableNo: t.tableNo });
  },

  closeQrcode() {
    this.setData({ qrcodeVisible: false });
  },

  onTableNoInput(e) {
    this.setData({ 'form.tableNo': e.detail.value });
  },
  onSeatInput(e) {
    this.setData({ 'form.seatCount': e.detail.value });
  },

  /** 阻止弹窗冒泡 */
  noop() {},
  toggleStatus(e) {
    this.setData({ 'form.status': e.detail.value ? 1 : 0 });
  },

  save() {
    const f = this.data.form;
    if (!f.tableNo || !f.tableNo.trim()) {
      util.toast('请填写桌号');
      return;
    }
    this.setData({ saving: true });
    api.saveTable({
      id: f.id || undefined,
      shopId: app.globalData.shopId,
      tableNo: f.tableNo,
      seatCount: Number(f.seatCount) || 4,
      status: f.status
    }).then(() => {
      util.toast(f.id ? '桌台已更新' : '桌台已新增', 'success');
      this.setData({ dialogVisible: false, saving: false });
      this.load();
    }).catch(e => {
      this.setData({ saving: false });
      util.toast('保存失败：' + e.message);
    });
  },

  remove(e) {
    const { id, no } = e.currentTarget.dataset;
    util.confirm('确定删除桌台「' + no + '」吗？', '删除确认').then(ok => {
      if (!ok) return;
      api.deleteTable(id).then(() => {
        util.toast('已删除', 'success');
        this.load();
      }).catch(err => util.toast('操作失败：' + err.message));
    });
  }
});
