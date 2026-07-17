const app = getApp();

Page({
  data: {
    keyword: '',
    items: [],
    searched: false
  },

  onInput(e) {
    this.setData({ keyword: e.detail.value });
  },

  async doSearch() {
    const keyword = this.data.keyword.trim();
    if (!keyword) return;

    wx.showLoading({ title: '搜索中' });
    try {
      const res = await wx.cloud.callFunction({
        name: 'getItems',
        data: { keyword, skip: 0, limit: 20 }
      });
      this.setData({ items: res.result.items, searched: true });
    } catch (err) {
      console.error('搜索失败', err);
      this.setData({ searched: true });
      wx.showToast({ title: '搜索失败', icon: 'none' });
    }
    wx.hideLoading();
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/item-detail/item-detail?id=${id}` });
  }
});
