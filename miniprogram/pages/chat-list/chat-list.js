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
      const conversations = res.result.conversations || [];
      this.setData({ conversations });
      const unreadCount = conversations.reduce((sum, item) => sum + Number(item.unreadCount || 0), 0);
      if (unreadCount > 0) {
        wx.setTabBarBadge({ index: 2, text: unreadCount > 99 ? '99+' : String(unreadCount) });
      } else {
        wx.removeTabBarBadge({ index: 2 });
      }
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
