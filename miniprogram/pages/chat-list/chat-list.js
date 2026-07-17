const db = wx.cloud.database();

const app = getApp();

Page({
  data: {
    conversations: []
  },

  onShow() {
    this.loadConversations();
  },

  async loadConversations() {
    try {
      const res = await wx.cloud.callFunction({ name: 'getConversations' });
      const convs = res.result.conversations;

      // 获取每个会话的对方用户信息和未读数
      const myOpenid = app.globalData.openid;
      const enrichedConvs = await Promise.all(convs.map(async (conv) => {
        // 获取对方 openid
        const partnerOpenid = conv.participants.find(id => id !== myOpenid);
        // 查询对方用户信息（昵称头像）
        const userRes = await db.collection('users').where({ _openid: partnerOpenid }).get();
        const partner = userRes.data[0] || { nickName: '未知用户', avatarUrl: '' };
        const unreadCount = conv.unreadCount ? (conv.unreadCount[myOpenid] || 0) : 0;

        return {
          ...conv,
          partner,
          unreadCount
        };
      }));

      this.setData({ conversations: enrichedConvs });
    } catch (err) {
      console.error('加载会话列表失败', err);
    }
  },

  enterChat(e) {
    const id = e.currentTarget.dataset.id;
    const conv = this.data.conversations.find(c => c._id === id);
    wx.navigateTo({
      url: `/pages/chat/chat?conversationId=${id}&itemTitle=${encodeURIComponent(conv.lastMessage.content || '聊天')}`
    });
  }
});