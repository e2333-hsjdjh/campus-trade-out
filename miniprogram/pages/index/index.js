const app = getApp();

// 时间格式化工具
function formatTime(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

Page({
  data: {
    nickName: '',
    schoolName: '',
    greeting: '',
    items: [],
    skip: 0,
    limit: 10,
    hasMore: true,
    loading: false,
    refreshing: false
  },

  onLoad() {
    if (!app.isLoggedIn()) {
      wx.redirectTo({ url: '/pages/login/login' });
      return;
    }

    const user = app.globalData.userInfo;
    const school = app.globalData.schoolList.find(s => s.id === user.schoolId);
    const hour = new Date().getHours();
    let greeting = '早上好';
    if (hour >= 12 && hour < 18) greeting = '下午好';
    else if (hour >= 18) greeting = '晚上好';

    this.setData({
      nickName: user.nickName,
      schoolName: school ? school.name : '未知学校',
      greeting
    });

    this.loadItems();
  },

  onShow() {
    // 每次页面显示时刷新列表（从后台切回时自动刷新）
    this.setData({ skip: 0 });
    this.loadItems(true);
  },

  // 加载商品列表
  async loadItems(isRefresh = false) {
    if (this.data.loading) return;
    this.setData({ loading: true });

    try {
      const skip = isRefresh ? 0 : this.data.skip;
      const res = await wx.cloud.callFunction({
        name: 'getItems',
        data: {
          skip,
          limit: this.data.limit
        }
      });

      const newItems = res.result.items;
      const total = res.result.total;
      const hasMore = res.result.hasMore;

      // 格式化时间
      newItems.forEach(item => {
        item.createTimeFormat = formatTime(item.createTime);
      });

      this.setData({
        items: isRefresh ? newItems : this.data.items.concat(newItems),
        skip: skip + newItems.length,
        total,
        hasMore,
        loading: false,
        refreshing: false
      });
    } catch (err) {
      console.error('加载商品失败', err);
      this.setData({ loading: false, refreshing: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  // 下拉刷新
  onRefresh() {
    this.setData({ refreshing: true, skip: 0 });
    this.loadItems(true);
  },

  // 上拉加载更多
  loadMore() {
    if (!this.data.hasMore || this.data.loading) return;
    this.loadItems();
  },

  // 跳转商品详情
  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/item-detail/item-detail?id=${id}` });
  },

  // 跳转发布页
  goPublish() {
    wx.switchTab({ url: '/pages/publish/publish' });
  },

  // 跳转搜索页
  goSearch() {
    wx.navigateTo({ url: '/pages/search/search' });
  }
});