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
      browseSchoolId: null,
      schoolPromptShown: false,
      schoolList: [
        { id: 'ruc_suzhou', name: '中国人民大学苏州校区' },
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
      const browseSchoolId = wx.getStorageSync('browseSchoolId');
      const defaultSchool = this.globalData.schoolList[0];
      const validBrowseSchool = this.globalData.schoolList.some(item => item.id === browseSchoolId);
      this.globalData.browseSchoolId = validBrowseSchool ? browseSchoolId : defaultSchool.id;
      if (!validBrowseSchool) wx.setStorageSync('browseSchoolId', defaultSchool.id);

      const validUserSchool = userInfo && this.globalData.schoolList.some(item => item.id === userInfo.schoolId);
      if (openid && userInfo && validUserSchool) {
        this.globalData.openid = openid;
        this.globalData.userInfo = userInfo;
        this.globalData.schoolId = userInfo.schoolId;
        this.globalData.browseSchoolId = userInfo.schoolId;
        console.log('登录状态已恢复', openid);
      } else if (openid || userInfo) {
        wx.removeStorageSync('openid');
        wx.removeStorageSync('userInfo');
        console.log('旧学校登录态已清理，请重新登录绑定当前校区');
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
      wx.setStorageSync('browseSchoolId', userInfo.schoolId);
      this.globalData.openid = openid;
      this.globalData.userInfo = userInfo;
      this.globalData.schoolId = userInfo.schoolId;
      this.globalData.browseSchoolId = userInfo.schoolId;
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
  },

  selectBrowseSchool(schoolId) {
    const school = this.globalData.schoolList.find(item => item.id === schoolId);
    if (!school) return null;
    this.globalData.browseSchoolId = schoolId;
    this.globalData.schoolPromptShown = true;
    wx.setStorageSync('browseSchoolId', schoolId);
    return school;
  },

  getBrowseSchool() {
    const schoolId = this.globalData.schoolId || this.globalData.browseSchoolId;
    return this.globalData.schoolList.find(item => item.id === schoolId) || null;
  },

  requireLogin(redirect = '') {
    if (this.isLoggedIn()) return true;
    const pages = getCurrentPages();
    const current = pages[pages.length - 1];
    if (current && current.route === 'pages/login/login') return false;
    const suffix = redirect ? `?redirect=${encodeURIComponent(redirect)}` : '';
    wx.navigateTo({ url: `/pages/login/login${suffix}` });
    return false;
  }
});
