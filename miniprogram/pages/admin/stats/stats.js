/**
 * admin/stats —— 收银统计：日/周/月/季切换 + 入账汇总 + 销量排行
 */
const api = require('../../../utils/request');
const util = require('../../../utils/util');

const PERIODS = [
  { key: 'day', name: '每天' },
  { key: 'week', name: '每周' },
  { key: 'month', name: '每月' },
  { key: 'quarter', name: '每季度' }
];

Page({
  data: {
    periods: PERIODS,
    period: 'day',
    periodName: '每天',
    cashier: null,
    sales: [],
    startDate: '',
    endDate: '',
    today: '',
    // 饼图色板（与图例共用）
    legendColors: ['#ff6b2c', '#409EFF', '#67C23A', '#E6A23C', '#F56C6C', '#909399'],
    loading: false
  },

  onLoad() {
    const today = this.formatDate(new Date());
    this.setData({ today });
    this.load();
  },

  /** 格式化日期 yyyy-MM-dd */
  formatDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  },

  onStartDateChange(e) {
    this.setData({ startDate: e.detail.value });
  },

  onEndDateChange(e) {
    this.setData({ endDate: e.detail.value });
  },

  /** 按自定义时间段查询 */
  searchByDate() {
    if (!this.data.startDate) {
      util.toast('请选择开始日期');
      return;
    }
    this.load();
  },

  /** 重置日期，回到预设周期 */
  resetDate() {
    this.setData({ startDate: '', endDate: '' });
    this.load();
  },

  switchPeriod(e) {
    const key = e.currentTarget.dataset.key;
    const p = PERIODS.find(x => x.key === key);
    this.setData({ period: key, periodName: p ? p.name : '', startDate: '', endDate: '' });
    this.load();
  },

  load() {
    this.setData({ loading: true });
    const { period, startDate, endDate } = this.data;
    Promise.all([
      api.cashierSummary(period, startDate, endDate),
      api.salesSummary(period, 5, startDate, endDate)
    ]).then(([cashier, sales]) => {
      const rows = (cashier.rows || []).map(r => ({
        ...r,
        amountText: util.fmtMoney(r.amount),
        percent: this.percent(r.amount, cashier.totalAmount)
      }));
      const salesRows = (sales.rows || []).map(r => ({
        ...r,
        amountText: util.fmtMoney(r.amount),
        width: this.widthOf(r.quantity, sales.totalQuantity),
        percent: this.percent(r.quantity, sales.totalQuantity)
      }));
      this.setData({
        cashier: { ...cashier, rows },
        sales: salesRows,
        loading: false
      }, () => {
        // 渲染完 canvas 后绘制饼图
        wx.nextTick(() => this.drawPie());
      });
    }).catch(e => {
      this.setData({ loading: false });
      util.toast('统计加载失败：' + e.message);
    });
  },

  /** 占比（百分比，保留 1 位小数） */
  percent(v, total) {
    const t = Number(total) || 0;
    if (t <= 0) return 0;
    return Math.round(Number(v) / t * 1000) / 10;
  },

  /** 条形宽度（0-100） */
  widthOf(v, total) {
    const t = Number(total) || 0;
    if (t <= 0) return 0;
    return Math.round(Number(v) / t * 100);
  },

  /** 销量环形饼图（canvas 2d 原生绘制） */
  drawPie() {
    const rows = this.data.sales;
    const total = rows.reduce((s, r) => s + (Number(r.quantity) || 0), 0);
    if (!rows.length || !total) return;

    const query = wx.createSelectorQuery().in(this);
    query.select('#pieCanvas').fields({ node: true, size: true }).exec(res => {
      if (!res || !res[0] || !res[0].node) return;
      const canvas = res[0].node;
      const ctx = canvas.getContext('2d');
      const dpr = (wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()).pixelRatio || 1;
      const w = res[0].width;
      const h = res[0].height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.scale(dpr, dpr);

      const cx = w / 2;
      const cy = h / 2;
      const r = Math.min(w, h) / 2 - 10;
      const innerR = r * 0.62;
      const colors = this.data.legendColors;

      // 扇形
      let start = -Math.PI / 2;
      rows.forEach((row, i) => {
        const angle = (Number(row.quantity) / total) * 2 * Math.PI;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, r, start, start + angle);
        ctx.closePath();
        ctx.fillStyle = colors[i % colors.length];
        ctx.fill();
        start += angle;
      });

      // 中心挖空成环形
      ctx.beginPath();
      ctx.arc(cx, cy, innerR, 0, 2 * Math.PI);
      ctx.fillStyle = '#fff';
      ctx.fill();

      // 中心文字
      ctx.textAlign = 'center';
      ctx.fillStyle = '#909399';
      ctx.font = 'normal 22rpx sans-serif';
      ctx.fillText('总销量', cx, cy - 10);
      ctx.fillStyle = '#ff6b2c';
      ctx.font = 'bold 30rpx sans-serif';
      ctx.fillText(total + ' 份', cx, cy + 24);
    });
  }
});
