const app = getApp();

Page({
  data: {
    item: null,
    seller: null
  },

  onLoad(options) {
    const id = options.id;
    if (!id) return;
    this.loadItemDetail(id);
  },

  async loadItemDetail(id) {
    wx.showLoading({ title: '加载中' });
    try {
      // 调用云函数获取单个商品详情
      const res = await wx.cloud.callFunction({
        name: 'getItemDetail',
        data: { itemId: id }
      });
      const item = res.result.item;
      const seller = res.result.seller;

      this.setData({ item, seller });
      wx.hideLoading();
    } catch (err) {
      wx.hideLoading();
      console.error('加载详情失败', err);
      wx.showToast({ title: '加载失败', icon: 'error' });
    }
  },

  // 点击“我想要”，跳转聊天（下一步实现）
 // 点击“我想要”
async wantItem() {
  if (!this.data.item) return;
  wx.showLoading({ title: '准备聊天' });
  try {
    const res = await wx.cloud.callFunction({
      name: 'createConversation',
      data: { itemId: this.data.item._id }
    });
    const conversationId = res.result.conversationId;
    wx.hideLoading();
    // 跳转到聊天页面，并传递会话 ID 和商品标题（用于标题栏）
    wx.navigateTo({
      url: `/pages/chat/chat?conversationId=${conversationId}&itemTitle=${encodeURIComponent(this.data.item.title)}`
    });
  } catch (err) {
    wx.hideLoading();
    console.error('创建会话失败', err);
    wx.showToast({ title: '操作失败，请重试', icon: 'none' });
  }
}
});