const app = getApp();

Page({
  data: {
    conversationId: '',
    itemTitle: '',
    myOpenid: '',
    messages: [],
    inputText: '',
    scrollToView: '',
    loadingMore: false,
    skip: 0,
    limit: 20,
    hasMore: true,
    watcher: null   // 保存实时监听实例，页面卸载时关闭
  },

  onLoad(options) {
    if (!app.requireLogin()) return;
    const { conversationId, itemTitle, draft } = options;
    this.setData({
      conversationId,
      itemTitle: decodeURIComponent(itemTitle || '聊天'),
      inputText: draft ? decodeURIComponent(draft) : '',
      myOpenid: app.globalData.openid
    });
    wx.setNavigationBarTitle({ title: this.data.itemTitle });

    this.loadMessages();
    this.startWatch();
    this.markRead();
  },

  async markRead() {
    try {
      await wx.cloud.callFunction({
        name: 'markRead',
        data: { conversationId: this.data.conversationId }
      });
    } catch (err) {
      console.error('标记已读失败', err);
    }
  },

  onUnload() {
    // 关闭实时监听
    if (this.data.watcher) {
      this.data.watcher.close();
    }
  },

  // 加载历史消息
  async loadMessages() {
    if (!this.data.hasMore || this.data.loadingMore) return;
    this.setData({ loadingMore: true });
    try {
      const res = await wx.cloud.callFunction({
        name: 'getMessages',
        data: {
          conversationId: this.data.conversationId,
          skip: this.data.skip,
          limit: this.data.limit
        }
      });
      const newMsgs = res.result.messages;
      newMsgs.forEach(msg => {
        msg.createTimeFormat = this.formatTime(msg.createTime);
      });
      const hasMore = newMsgs.length === this.data.limit;
      // 新消息插入到数组头部
      this.setData({
        messages: [...newMsgs, ...this.data.messages],
        skip: this.data.skip + newMsgs.length,
        hasMore,
        loadingMore: false
      });
      // 如果没有历史消息，不需要滚动
    } catch (err) {
      console.error('加载消息失败', err);
      this.setData({ loadingMore: false });
    }
  },

  // 上拉加载更多
  loadMore() {
    this.loadMessages();
  },

  // 开始实时监听新消息
  startWatch() {
    const db = wx.cloud.database();
    const watcher = db.collection('messages')
      .where({
        conversationId: this.data.conversationId
      })
      .orderBy('createTime', 'asc')
      .watch({
        onChange: (snapshot) => {
          if (snapshot.type === 'init') {
            // 初始化数据由 getMessages 加载，这里不处理
            return;
          }
          // 有新消息（snapshot.docChanges）
          const { docChanges } = snapshot;
          if (docChanges) {
            docChanges.forEach(change => {
              if (change.queueType === 'enqueue') {
                // 新消息
                const newMsg = change.doc;
                newMsg.createTimeFormat = this.formatTime(newMsg.createTime);
                // 去重：避免重复添加
                if (!this.data.messages.some(m => m._id === newMsg._id)) {
                  this.setData({
                    messages: [...this.data.messages, newMsg],
                    scrollToView: `msg-${newMsg._id}`
                  });
                }
              }
            });
          }
        },
        onError: (err) => {
          console.error('监听失败', err);
        }
      });
    this.setData({ watcher });
  },

  // 输入事件
  onInput(e) {
    this.setData({ inputText: e.detail.value });
  },

  // 发送消息
  async sendMsg() {
    const text = this.data.inputText.trim();
    if (!text) return;

    this.setData({ inputText: '' });
    try {
      await wx.cloud.callFunction({
        name: 'sendMessage',
        data: {
          conversationId: this.data.conversationId,
          content: text
        }
      });
      // 消息通过 watch 自动推入，无需手动添加
    } catch (err) {
      console.error('发送失败', err);
      wx.showToast({ title: '发送失败', icon: 'none' });
    }
  },

  // 发送微信号（从用户资料读取，或手动输入）
  async sendMyWechat() {
    const user = app.globalData.userInfo;
    let wechatId = user.wechatId;
    if (!wechatId) {
      // 弹出输入框
      const { value } = await new Promise(resolve => {
        wx.showModal({
          title: '设置微信号',
          editable: true,
          placeholderText: '请输入你的微信号',
          success: (res) => {
            if (res.confirm) resolve({ value: res.content });
            else resolve({ value: null });
          }
        });
      });
      if (!value) return;
      wechatId = value.trim();
      // 保存到用户资料（可异步）
      wx.cloud.callFunction({
        name: 'updateProfile',  // 后续补充
        data: { wechatId }
      });
      app.globalData.userInfo.wechatId = wechatId;
    }
    this.setData({ inputText: `我的微信号：${wechatId}` });
    this.sendMsg();
  },

  // 时间格式化辅助
  formatTime(date) {
    const d = new Date(date);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }
});
