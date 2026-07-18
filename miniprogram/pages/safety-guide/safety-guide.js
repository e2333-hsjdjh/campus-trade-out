const app = getApp();

Page({
  onLoad() {
    app.requireLogin();
  },

  goHome() {
    wx.switchTab({ url: '/pages/index/index' });
  },

  goPublish() {
    wx.switchTab({ url: '/pages/publish/publish' });
  },

  reportProblem() {
    wx.showModal({
      title: '遇到可疑交易？',
      content: '请停止付款并保存聊天、商品和转账截图。校园闲置不会要求你脱离微信或点击陌生链接付款。',
      showCancel: false,
      confirmText: '我知道了'
    });
  }
});
