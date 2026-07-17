const app = getApp();

Page({
  data: {
    statusBarHeight: 20,
    userInfo: {},
    schoolName: '',
    stats: { total: 0, selling: 0, sold: 0 }
  },

  onLoad() {
    const windowInfo = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    this.setData({ statusBarHeight: windowInfo.statusBarHeight || 20 });
  },

  onShow() {
    if (!app.requireLogin('/pages/mine/mine')) return;
    const user = app.globalData.userInfo || {};
    const school = app.globalData.schoolList.find(item => item.id === user.schoolId);
    this.setData({ userInfo: user, schoolName: school ? school.name : '校园用户' });
    this.loadStats();
  },

  async loadStats() {
    try {
      const res = await wx.cloud.callFunction({ name: 'getMyItems' });
      const items = res.result.items || [];
      this.setData({
        stats: {
          total: items.length,
          selling: items.filter(item => item.status === '在售').length,
          sold: items.filter(item => item.status === '已售出').length
        }
      });
    } catch (err) {
      console.error('加载个人数据失败', err);
    }
  },

  goUserHome() {
    wx.navigateTo({ url: '/pages/user-home/user-home' });
  },

  goMyItems() {
    wx.navigateTo({ url: '/pages/mine/my-items/my-items' });
  },

  goChatList() {
    wx.navigateTo({ url: '/pages/chat-list/chat-list' });
  },

  goEditProfile() {
    wx.navigateTo({ url: '/pages/profile/profile' });
  },

  showSafetyGuide() {
    wx.showModal({
      title: '校园安全交易',
      content: '建议在校内公共区域当面验货，不提前支付押金，不通过陌生链接付款。',
      showCancel: false,
      confirmText: '知道了'
    });
  },

  logout() {
    wx.showModal({
      title: '退出登录',
      content: '退出后仍可浏览当前学校的闲置商品。',
      success: ({ confirm }) => {
        if (!confirm) return;
        app.clearLoginState();
        wx.switchTab({ url: '/pages/index/index' });
      }
    });
  }
});
