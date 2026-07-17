const app = getApp();

Page({
  data: {
    conversations: []
  },

  onShow() {
    if (!app.requireLogin()) return;
    this.loadConversations();
  },

  async loadConversations() {
    try {
      const res = await wx.cloud.callFunction({ name: 'getConversations' });
      this.setData({ conversations: res.result.conversations });
    } catch (err) {
      console.error('加载会话列表失败', err);
    }
  },

  enterChat(e) {
    const id = e.currentTarget.dataset.id;
    const conv = this.data.conversations.find(c => c._id === id);
    wx.navigateTo({
      url: `/pages/chat/chat?conversationId=${id}&itemTitle=${encodeURIComponent(conv.itemTitle || '商品咨询')}`
    });
  }
});
