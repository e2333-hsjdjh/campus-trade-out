const app = getApp();

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getMonth() + 1}月${date.getDate()}日收藏`;
}

Page({
  data: {
    items: [],
    loading: false,
    removingId: '',
    skip: 0,
    limit: 20,
    hasMore: true
  },

  onShow() {
    if (!app.requireLogin()) return;
    this.loadFavorites(true);
  },

  onReachBottom() {
    this.loadFavorites();
  },

  async loadFavorites(reset = false) {
    if (this.data.loading || (!reset && !this.data.hasMore)) return;
    this.setData({ loading: true });
    try {
      const skip = reset ? 0 : this.data.skip;
      const res = await wx.cloud.callFunction({
        name: 'getFavorites',
        data: { skip, limit: this.data.limit }
      });
      const result = res.result || {};
      const newItems = (result.items || []).map(item => ({
        ...item,
        favoriteTimeFormat: formatDate(item.favoriteTime)
      }));
      this.setData({
        items: reset ? newItems : this.data.items.concat(newItems),
        skip: Number.isFinite(result.nextSkip) ? result.nextSkip : skip + newItems.length,
        hasMore: !!result.hasMore,
        loading: false
      });
    } catch (err) {
      console.error('加载收藏失败', err);
      const message = String((err && err.errMsg) || err);
      wx.showToast({
        title: message.includes('FUNCTION_NOT_FOUND') ? '请先部署收藏云函数' : '收藏列表加载失败',
        icon: 'none'
      });
      this.setData({ loading: false });
    }
  },

  goDetail(e) {
    wx.navigateTo({ url: `/pages/item-detail/item-detail?id=${e.currentTarget.dataset.id}` });
  },

  async removeFavorite(e) {
    const itemId = e.currentTarget.dataset.id;
    if (!itemId || this.data.removingId) return;
    this.setData({ removingId: itemId });
    try {
      await wx.cloud.callFunction({
        name: 'toggleFavorite',
        data: { itemId, favorited: false }
      });
      this.setData({
        items: this.data.items.filter(item => item._id !== itemId),
        removingId: ''
      });
      wx.showToast({ title: '已取消收藏', icon: 'success' });
    } catch (err) {
      console.error('取消收藏失败', err);
      this.setData({ removingId: '' });
      wx.showToast({ title: '取消收藏失败', icon: 'none' });
    }
  },

  goHome() {
    wx.switchTab({ url: '/pages/index/index' });
  }
});
