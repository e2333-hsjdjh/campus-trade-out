const app = getApp();

Page({
  data: {
    items: []
  },

  onShow() {
    if (!app.requireLogin()) return;
    this.loadItems();
  },

  async loadItems() {
    wx.showLoading({ title: '加载中' });
    try {
      const res = await wx.cloud.callFunction({ name: 'getMyItems' });
      this.setData({ items: res.result.items });
    } catch (err) {
      console.error('加载我的发布失败:', err);
      wx.showToast({ title: '加载失败，请检查权限', icon: 'none' });
    }
    wx.hideLoading();
  },

  editItem(e) {
    wx.navigateTo({ url: `/pages/edit-item/edit-item?id=${e.currentTarget.dataset.id}` });
  },

  async markSold(e) {
    const id = e.currentTarget.dataset.id;
    wx.showLoading({ title: '操作中' });
    try {
      await wx.cloud.callFunction({
        name: 'updateItemStatus',
        data: { itemId: id, status: '已售出' }
      });
      wx.showToast({ title: '已标记为已售' });
      this.loadItems();
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '操作失败', icon: 'none' });
    }
  },

  async delist(e) {
    const id = e.currentTarget.dataset.id;
    wx.showLoading({ title: '操作中' });
    try {
      await wx.cloud.callFunction({
        name: 'updateItemStatus',
        data: { itemId: id, status: '已下架' }
      });
      wx.showToast({ title: '已下架' });
      this.loadItems();
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '操作失败', icon: 'none' });
    }
  }
});
