/**
 * admin/pickup-code —— 自提码板块：展示/保存自提码二维码
 * 顾客扫此码进入自提模式：菜品默认打包且不可更改（账号信息不变）
 */
const config = require('../../../utils/config');
const app = getApp();

Page({
  data: {
    baseUrl: config.BASE_URL,
    qrSrc: '',        // 二维码图片地址（后端接口实时生成）
    env: 'release',   // release 正式 / trial 体验 / develop 开发
    loading: false,
    qrLoading: false  // 图片加载中（调用微信接口生成需要几秒）
  },

  onShow() {
    // 权限校验：非管理员不能进入
    if (!app.globalData.isAdmin) {
      wx.showToast({ title: '无权限访问', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }
    this.loadQr();
  },

  /** 加载自提码二维码图片 */
  loadQr() {
    this.setData({ loading: true, qrLoading: true, qrSrc: '' });
    const url = this.data.baseUrl + '/api/admin/pickup/qrcode?env=' + this.data.env + '&t=' + Date.now();
    // 延迟一帧再设置 src，确保 loading 提示先渲染
    setTimeout(() => {
      this.setData({ qrSrc: url, loading: false });
    }, 50);
  },

  /** 图片加载完成 */
  onQrLoad() {
    this.setData({ qrLoading: false });
  },

  /** 切换小程序版本（正式/体验/开发）重新生成 */
  switchEnv(e) {
    const env = e.currentTarget.dataset.env;
    if (env === this.data.env) return;
    this.setData({ env });
    this.loadQr();
  },

  /** 图片加载失败（如微信接口未配置/未发布导致生成失败） */
  onQrError() {
    this.setData({ qrSrc: '', qrLoading: false });
    wx.showToast({ title: '二维码生成失败：请检查后端微信 appid/secret 配置', icon: 'none', duration: 2500 });
  },

  /** 下载二维码并保存到系统相册（可打印张贴） */
  saveQr() {
    wx.showLoading({ title: '生成中...' });
    wx.downloadFile({
      url: this.data.qrSrc,
      success: (res) => {
        wx.hideLoading();
        if (res.statusCode !== 200) {
          wx.showToast({ title: '二维码生成失败，请检查后端与微信配置', icon: 'none' });
          return;
        }
        wx.saveImageToPhotosAlbum({
          filePath: res.tempFilePath,
          success: () => wx.showToast({ title: '已保存到相册', icon: 'success' }),
          fail: (err) => {
            if (err.errMsg && err.errMsg.indexOf('auth') >= 0) {
              wx.showModal({
                title: '需要相册权限',
                content: '请在「设置 → 隐私」中允许保存到相册后再试',
                confirmText: '去设置',
                success: (r) => {
                  if (r.confirm) wx.openSetting();
                }
              });
            } else {
              wx.showToast({ title: '保存失败：' + (err.errMsg || ''), icon: 'none' });
            }
          }
        });
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: '网络错误，请检查接口地址', icon: 'none' });
      }
    });
  }
});
