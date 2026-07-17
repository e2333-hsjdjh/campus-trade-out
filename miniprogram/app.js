/**
 * 校园二手交易小程序 - 入口文件
 * 负责云开发初始化、全局数据管理、登录状态恢复
 */
App({
  onLaunch() {
    // 1. 初始化云开发
    wx.cloud.init({
      env: 'cloud1-d8gctnpc38f1b09ce',
      traceUser: true,
    });

    // 2. 必须先在 globalData 中定义所有字段，再恢复缓存
    this.globalData = {
      userInfo: null,
      openid: null,
      schoolId: null,
      schoolList: [
        { id: 'sc001', name: 'XX大学' },
        { id: 'sc002', name: 'YY学院' },
        { id: 'sc003', name: 'ZZ职业技术学院' },
      ]
    };

    // 3. 从本地缓存恢复登录状态（此时 globalData 已存在）
    this.restoreLoginState();
  },

  // 从缓存恢复登录态
  restoreLoginState() {
    try {
      const openid = wx.getStorageSync('openid');
      const userInfo = wx.getStorageSync('userInfo');
      if (openid && userInfo) {
        this.globalData.openid = openid;
        this.globalData.userInfo = userInfo;
        this.globalData.schoolId = userInfo.schoolId;
        console.log('登录状态已恢复', openid);
      }
    } catch (e) {
      console.error('恢复登录状态失败', e);
    }
  },

  // 保存登录状态到本地缓存
  saveLoginState(openid, userInfo) {
    try {
      wx.setStorageSync('openid', openid);
      wx.setStorageSync('userInfo', userInfo);
      this.globalData.openid = openid;
      this.globalData.userInfo = userInfo;
      this.globalData.schoolId = userInfo.schoolId;
      console.log('登录状态已保存');
    } catch (e) {
      console.error('保存登录状态失败', e);
    }
  },

  // 清除登录状态（退出登录时使用）
  clearLoginState() {
    try {
      wx.removeStorageSync('openid');
      wx.removeStorageSync('userInfo');
      this.globalData.openid = null;
      this.globalData.userInfo = null;
      this.globalData.schoolId = null;
    } catch (e) {
      console.error('清除登录状态失败', e);
    }
  },

  isLoggedIn() {
    return !!this.globalData.openid;
  }
});
