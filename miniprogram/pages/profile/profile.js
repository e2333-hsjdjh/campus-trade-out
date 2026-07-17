const app = getApp();

Page({
  data: {
    avatarUrl: '',
    nickName: '',
    wechatId: ''
  },

  onLoad() {
    if (!app.requireLogin()) return;
    const user = app.globalData.userInfo || {};
    this.setData({
      avatarUrl: user.avatarUrl || '',
      nickName: user.nickName || '',
      wechatId: user.wechatId || ''
    });
  },

  changeAvatar() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        const tempFilePath = res.tempFilePaths[0];
        wx.showLoading({ title: '上传中' });
        try {
          const cloudPath = `avatars/${Date.now()}-${Math.random().toString(36).slice(2)}.png`;
          const uploadRes = await wx.cloud.uploadFile({
            cloudPath,
            filePath: tempFilePath
          });
          this.setData({ avatarUrl: uploadRes.fileID });
        } catch (err) {
          wx.showToast({ title: '上传失败', icon: 'none' });
        }
        wx.hideLoading();
      }
    });
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [field]: e.detail.value });
  },

  async saveProfile() {
    wx.showLoading({ title: '保存中' });
    try {
      const res = await wx.cloud.callFunction({
        name: 'updateProfile',
        data: {
          nickName: this.data.nickName,
          avatarUrl: this.data.avatarUrl,
          wechatId: this.data.wechatId
        }
      });
      if (res.result.success) {
        app.saveLoginState(app.globalData.openid, res.result.user);
        wx.showToast({ title: '保存成功', icon: 'success' });
        setTimeout(() => {
          wx.navigateBack();
        }, 1000);
      } else {
        wx.showToast({ title: '保存失败', icon: 'none' });
      }
    } catch (err) {
      console.error('保存失败', err);
      wx.showToast({ title: '保存失败', icon: 'none' });
    }
    wx.hideLoading();
  }
});
