/**
 * util.js —— 通用工具函数
 */

/** 金额格式化：3 -> "3.00" */
function fmtMoney(n) {
  const v = Number(n);
  if (!isFinite(v)) return '0.00';
  return v.toFixed(2);
}

/** 时间格式化：2026-09-05T12:30:00 -> 2026-09-05 12:30 */
function fmtTime(t) {
  if (!t) return '';
  return String(t).replace('T', ' ').substring(0, 16);
}

/** 订单状态文案 */
function orderStatusText(s) {
  const map = {
    0: '待支付',
    1: '已下单',
    2: '制作中',
    3: '已上菜',
    4: '已完成',
    5: '已取消',
    6: '已退款'
  };
  return map[s] !== undefined ? map[s] : '未知';
}

/** 订单状态标签样式 */
function orderStatusTag(s) {
  const map = {
    0: 'tag-warn',
    1: 'tag-warn',
    2: 'tag-info',
    3: 'tag-success',
    4: 'tag-muted',
    5: 'tag-muted',
    6: 'tag-danger'
  };
  return map[s] || 'tag-muted';
}

/** 明细制作状态文案 */
function itemStatusText(s) {
  const map = { 0: '待制作', 1: '制作中', 2: '已出餐', 3: '已退菜' };
  return map[s] !== undefined ? map[s] : '未知';
}

/** 明细制作状态标签样式 */
function itemStatusTag(s) {
  const map = { 0: 'tag-warn', 1: 'tag-info', 2: 'tag-success', 3: 'tag-danger' };
  return map[s] || 'tag-muted';
}

/** 生成随机 id（本地 openid / 临时 key） */
function uuid() {
  const s = [];
  const hex = '0123456789abcdef';
  for (let i = 0; i < 32; i++) {
    s.push(hex[Math.floor(Math.random() * 16)]);
  }
  const ts = Date.now().toString(36);
  return ts + '_' + s.join('');
}

/** 轻提示 */
function toast(title, icon = 'none') {
  wx.showToast({ title, icon, duration: 2000 });
}

/** 确认框（Promise，resolve true/false） */
function confirm(content, title = '提示') {
  return new Promise(resolve => {
    wx.showModal({
      title,
      content,
      confirmColor: '#ff6b2c',
      success(res) {
        resolve(!!res.confirm);
      },
      fail() {
        resolve(false);
      }
    });
  });
}

module.exports = {
  fmtMoney,
  fmtTime,
  orderStatusText,
  orderStatusTag,
  itemStatusText,
  itemStatusTag,
  uuid,
  toast,
  confirm
};
