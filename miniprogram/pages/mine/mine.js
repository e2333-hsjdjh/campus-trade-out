const app = getApp();

Page({
  data: {
    userInfo: {},
    schoolName: ''
  },

  onShow() {
    const user = app.globalData.userInfo || {};
    const school = app.globalData.schoolList.find(s => s.id === user.schoolId);
    this.setData({
      userInfo: user,
      schoolName: school ? school.name : ''
    });
  },

  goMyItems() {
    wx.navigateTo({ url: '/pages/mine/my-items/my-items' });
  },

  goChatList() {
    wx.navigateTo({ url: '/pages/chat-list/chat-list' });
  },

  goEditProfile() {
    wx.navigateTo({ url: '/pages/profile/profile' });
  }
});