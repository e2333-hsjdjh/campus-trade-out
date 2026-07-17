const app = getApp();

Page({
  data: {
    statusBarHeight: 20,
    redirect: '',
    selectedSchoolId: '',
    selectedSchoolName: '',
    nickName: '',
    agreementChecked: true,
    nicknameMode: false
  },

  onLoad(options) {
    if (app.isLoggedIn()) {
      wx.switchTab({ url: '/pages/index/index' });
      return;
    }
    const windowInfo = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    const school = app.getBrowseSchool() || app.globalData.schoolList[0];
    if (school && !app.getBrowseSchool()) app.selectBrowseSchool(school.id);
    this.setData({
      statusBarHeight: windowInfo.statusBarHeight || 20,
      redirect: options.redirect ? decodeURIComponent(options.redirect) : '',
      selectedSchoolId: school ? school.id : '',
      selectedSchoolName: school ? school.name : '请选择学校'
    });
  },

  closeLogin() {
    wx.switchTab({ url: '/pages/index/index' });
  },

  showLoginHelp() {
    wx.showModal({
      title: '登录帮助',
      content: '请先确认已选择学校，并已在云环境中部署 login 云函数和创建 users 集合。手机号登录不可用时，可使用昵称登录。',
      showCancel: false,
      confirmText: '知道了'
    });
  },

  changeSchool() {
    const schools = app.globalData.schoolList;
    wx.showActionSheet({
      itemList: schools.map(item => item.name),
      success: ({ tapIndex }) => {
        const school = app.selectBrowseSchool(schools[tapIndex].id);
        this.setData({
          selectedSchoolId: school.id,
          selectedSchoolName: school.name
        });
      }
    });
  },

  toggleAgreement() {
    this.setData({ agreementChecked: !this.data.agreementChecked });
  },

  showNicknameMode() {
    if (!this.data.agreementChecked) {
      wx.showToast({ title: '请先阅读并同意服务说明', icon: 'none' });
      return;
    }
    this.setData({ nicknameMode: true });
  },

  onNickNameInput(e) {
    this.setData({ nickName: e.detail.value });
  },

  async loginWithPhoneNumber(e) {
    if (!this.data.agreementChecked) {
      wx.showToast({ title: '请先阅读并同意服务说明', icon: 'none' });
      return;
    }
    const phoneCode = e.detail && e.detail.code;
    if (!phoneCode) {
      wx.showToast({ title: '未授权手机号，可使用昵称登录', icon: 'none' });
      return;
    }
    await this.submitLogin({
      schoolId: this.data.selectedSchoolId,
      phoneCode
    });
  },

  async doNicknameLogin() {
    const nickName = this.data.nickName.trim();
    if (!this.data.agreementChecked) {
      wx.showToast({ title: '请先阅读并同意服务说明', icon: 'none' });
      return;
    }
    if (!nickName) {
      wx.showToast({ title: '请输入昵称', icon: 'none' });
      return;
    }
    await this.submitLogin({
      schoolId: this.data.selectedSchoolId,
      nickName
    });
  },

  async submitLogin(data) {
    wx.showLoading({ title: '正在进入校园圈' });
    try {
      const res = await wx.cloud.callFunction({ name: 'login', data });
      const { openid, user } = res.result;
      app.saveLoginState(openid, user);
      wx.hideLoading();
      wx.showToast({ title: '登录成功', icon: 'success' });
      this.finishLogin();
    } catch (err) {
      console.error('登录失败', err);
      wx.hideLoading();
      wx.showToast({ title: '登录失败，请检查云环境', icon: 'none' });
    }
  },

  finishLogin() {
    if (this.data.redirect === '/pages/publish/publish' || this.data.redirect === '/pages/mine/mine') {
      wx.switchTab({ url: this.data.redirect });
      return;
    }
    const pages = getCurrentPages();
    if (pages.length > 1) wx.navigateBack();
    else wx.switchTab({ url: '/pages/index/index' });
  }
});
