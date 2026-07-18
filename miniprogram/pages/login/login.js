const app = getApp();

Page({
  data: {
    step: 1,
    allSchools: [],
    filteredSchools: [],
    searchKey: '',
    selectedSchoolId: '',
    selectedSchoolName: '',
    avatarUrl: '',
    nickName: '',
    canIUseGetUserProfile: false,
  },

  onLoad() {
    // 已登录则直接跳转首页
    if (app.isLoggedIn()) {
      wx.switchTab({ url: '/pages/index/index' });
      return;
    }

    this.setData({
      allSchools: app.globalData.schoolList,
      filteredSchools: app.globalData.schoolList
    });

    if (wx.getUserProfile) {
      this.setData({ canIUseGetUserProfile: true });
    }
  },

  onSearchSchool(e) {
    const key = e.detail.value.toLowerCase();
    const filtered = this.data.allSchools.filter(s =>
      s.name.toLowerCase().includes(key)
    );
    this.setData({ searchKey: key, filteredSchools: filtered });
  },

  selectSchool(e) {
    const id = e.currentTarget.dataset.id;
    const school = this.data.allSchools.find(s => s.id === id);
    this.setData({
      selectedSchoolId: id,
      selectedSchoolName: school ? school.name : ''
    });
  },

  nextStep() {
    if (!this.data.selectedSchoolId) return;
    this.setData({ step: 2 });
  },

  getUserProfile() {
    if (!this.data.canIUseGetUserProfile) {
      wx.showToast({ title: '请升级微信版本', icon: 'none' });
      return;
    }
    wx.getUserProfile({
      desc: '用于完善个人资料',
      success: (res) => {
        this.setData({
          avatarUrl: res.userInfo.avatarUrl,
          nickName: res.userInfo.nickName
        });
      },
      fail: (err) => {
        console.error('获取用户信息失败', err);
        wx.showToast({ title: '可手动填写信息', icon: 'none' });
      }
    });
  },

  onNickNameInput(e) {
    this.setData({ nickName: e.detail.value });
  },

  async doLogin() {
    const { selectedSchoolId, nickName, avatarUrl } = this.data;
    if (!nickName.trim()) {
      wx.showToast({ title: '请输入昵称', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '登录中...' });

    try {
      const res = await wx.cloud.callFunction({
        name: 'login',
        data: {
          schoolId: selectedSchoolId,
          nickName: nickName.trim(),
          avatarUrl: avatarUrl
        }
      });

      const { openid, user } = res.result;
      // 保存登录状态到全局和本地缓存
      app.saveLoginState(openid, user);

      wx.hideLoading();
      wx.showToast({ title: '登录成功', icon: 'success' });
      wx.switchTab({ url: '/pages/index/index' });

    } catch (err) {
      wx.hideLoading();
      console.error('登录失败', err);
      wx.showToast({ title: '登录失败，请重试', icon: 'error' });
    }
  }
});