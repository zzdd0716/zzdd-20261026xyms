/**
 * profile —— 我的：门店/桌台信息 + 商家管理后台入口
 */
const config = require('../../utils/config');
const api = require('../../utils/request');
const app = getApp();

Page({
  data: {
    tableNo: '',
    isPickup: false,
    shopId: 1,
    userId: null,
    openidTail: '',
    isAdmin: false,
    baseUrl: config.BASE_URL,
    nickname: '',
    avatar: '',
    // AI 客服
    chatVisible: false,
    chatHistory: [],
    chatInput: '',
    chatLoading: false
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3 });
    }
    const g = app.globalData;
    this.setData({
      tableNo: g.tableNo,
      isPickup: g.entryMode === 'pickup',
      shopId: g.shopId,
      userId: g.userId,
      isAdmin: g.isAdmin,
      nickname: g.nickname || '微信用户',
      avatar: g.avatar || '',
      openidTail: g.openid ? g.openid.slice(-6) : ''
    });
  },

  /** 选择头像 */
  chooseAvatar() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempPath = res.tempFiles[0].tempFilePath;
        this.uploadAvatar(tempPath);
      }
    });
  },

  /** 上传头像（base64方式，避免真机uploadFile域名校验） */
  uploadAvatar(filePath) {
    wx.showLoading({ title: '上传中...' });
    // 读取文件转base64
    wx.getFileSystemManager().readFile({
      filePath: filePath,
      encoding: 'base64',
      success: (res) => {
        const base64Data = 'data:image/png;base64,' + res.data;
        wx.request({
          url: config.BASE_URL + '/api/upload/image-base64',
          method: 'POST',
          data: { image: base64Data },
          success: (resp) => {
            wx.hideLoading();
            const data = resp.data;
            let avatarUrl = data.url;
            if (avatarUrl && avatarUrl.startsWith('/')) {
              avatarUrl = config.BASE_URL + avatarUrl;
            }
            if (avatarUrl) {
              this.saveUserInfo(null, avatarUrl);
            } else {
              wx.showToast({ title: data.message || '上传失败', icon: 'none' });
            }
          },
          fail: () => {
            wx.hideLoading();
            wx.showToast({ title: '上传失败，请检查网络', icon: 'none' });
          }
        });
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: '读取图片失败', icon: 'none' });
      }
    });
  },

  /** 编辑昵称 */
  editNickname() {
    wx.showModal({
      title: '修改昵称',
      editable: true,
      placeholderText: '请输入昵称',
      content: this.data.nickname,
      success: (res) => {
        if (res.confirm && res.content && res.content.trim()) {
          this.saveUserInfo(res.content.trim(), null);
        }
      }
    });
  },

  /** 保存用户信息到后端和本地 */
  saveUserInfo(nickname, avatar) {
    const userId = this.data.userId;
    if (!userId) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    api.updateUser(userId, nickname, avatar).then(user => {
      // request.js 封装后成功直接返回 data（User对象）
      if (user) {
        app.globalData.nickname = user.nickname;
        app.globalData.avatar = user.avatar;
        this.setData({
          nickname: user.nickname || '微信用户',
          avatar: user.avatar || ''
        });
      }
      wx.showToast({ title: '保存成功', icon: 'success' });
    }).catch((err) => {
      wx.showToast({ title: err.message || '保存失败', icon: 'none' });
    });
  },

  /** 切换桌台（回到首页重新选择） */
  changeTable() {
    wx.reLaunch({ url: '/pages/index/index' });
  },

  /** 进入商家管理后台（仅管理员） */
  goAdmin() {
    if (!app.globalData.isAdmin) {
      wx.showToast({ title: '无权限访问', icon: 'none' });
      return;
    }
    wx.navigateTo({ url: '/pages/admin/home/home' });
  },

  // ==================== AI 智能客服 ====================

  /** 打开客服弹窗 */
  openChat() {
    this.setData({
      chatVisible: true,
      chatHistory: [{ role: 'ai', content: '你好！我是禧粤美食智能客服，有什么可以帮你的？' }],
      chatInput: ''
    });
  },

  /** 关闭客服弹窗 */
  closeChat() {
    this.setData({ chatVisible: false });
  },

  /** 输入问题 */
  onChatInput(e) {
    this.setData({ chatInput: e.detail.value });
  },

  /** 发送问题给AI */
  sendChat() {
    const text = (this.data.chatInput || '').trim();
    if (!text || this.data.chatLoading) return;

    const shopId = this.data.shopId;
    const history = this.data.chatHistory.concat([{ role: 'user', content: text }]);
    this.setData({ chatHistory: history, chatInput: '', chatLoading: true });

    api.aiChat(shopId, text).then(reply => {
      this.setData({
        chatHistory: this.data.chatHistory.concat([{ role: 'ai', content: reply }]),
        chatLoading: false
      });
    }).catch(() => {
      this.setData({
        chatHistory: this.data.chatHistory.concat([{ role: 'ai', content: '抱歉，我暂时答不上来，请联系店员。' }]),
        chatLoading: false
      });
    });
  },

  /** 阻止冒泡占位 */
  noop() {}
});
