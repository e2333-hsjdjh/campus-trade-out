const app = getApp();

function formatTime(value) {
  const date = new Date(value);
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

Page({
  data: {
    statusBarHeight: 20,
    userInfo: {},
    schoolName: '',
    activeTab: '在售',
    items: [],
    visibleItems: [],
    stats: { total: 0, selling: 0, sold: 0 }
  },

  onLoad() {
    const windowInfo = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    this.setData({ statusBarHeight: windowInfo.statusBarHeight || 20 });
  },

  onShow() {
    if (!app.requireLogin()) return;
    const user = app.globalData.userInfo || {};
    const school = app.globalData.schoolList.find(item => item.id === user.schoolId);
    this.setData({ userInfo: user, schoolName: school ? school.name : '校园用户' });
    this.loadItems();
  },

  async loadItems() {
    wx.showLoading({ title: '加载主页' });
    try {
      const res = await wx.cloud.callFunction({ name: 'getMyItems' });
      const items = (res.result.items || []).map(item => ({ ...item, createTimeFormat: formatTime(item.createTime) }));
      this.setData({
        items,
        stats: {
          total: items.length,
          selling: items.filter(item => item.status === '在售').length,
          sold: items.filter(item => item.status === '已售出').length
        }
      });
      this.applyFilter();
    } catch (err) {
      console.error('加载个人主页失败', err);
      wx.showToast({ title: '主页加载失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  applyFilter() {
    const status = this.data.activeTab;
    const visibleItems = status === '全部' ? this.data.items : this.data.items.filter(item => item.status === status || (status === '已售' && item.status === '已售出'));
    this.setData({ visibleItems });
  },

  changeTab(e) {
    this.setData({ activeTab: e.currentTarget.dataset.tab });
    this.applyFilter();
  },

  goBack() {
    wx.navigateBack();
  },

  goEditProfile() {
    wx.navigateTo({ url: '/pages/profile/profile' });
  },

  goDetail(e) {
    wx.navigateTo({ url: `/pages/item-detail/item-detail?id=${e.currentTarget.dataset.id}` });
  }
});
