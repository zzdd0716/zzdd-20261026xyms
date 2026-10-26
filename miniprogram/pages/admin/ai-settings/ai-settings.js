const api = require('../../../utils/request');
const app = getApp();

Page({
  data: {
    shopId: 1,
    recommendEnabled: true,
    chatEnabled: true
  },

  onLoad() {
    this.setData({ shopId: app.globalData.shopId });
    this.loadConfig();
  },

  /** 加载开关配置 */
  loadConfig() {
    api.getAiConfig(this.data.shopId).then(config => {
      this.setData({
        recommendEnabled: config.ai_recommend_enabled !== false,
        chatEnabled: config.ai_chat_enabled !== false
      });
    });
  },

  /** 切换AI推荐开关 */
  onRecommendChange(e) {
    const value = e.detail.value;
    this.setData({ recommendEnabled: value });
    this.saveConfig('ai_recommend_enabled', value);
  },

  /** 切换AI客服开关 */
  onChatChange(e) {
    const value = e.detail.value;
    this.setData({ chatEnabled: value });
    this.saveConfig('ai_chat_enabled', value);
  },

  /** 保存配置到后端 */
  saveConfig(key, value) {
    api.updateAiConfig(this.data.shopId, key, value).then(() => {
      wx.showToast({ title: '已保存', icon: 'success' });
    }).catch(() => {
      wx.showToast({ title: '保存失败', icon: 'none' });
    });
  }
});
