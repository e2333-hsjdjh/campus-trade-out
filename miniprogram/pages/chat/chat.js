const app = getApp();

Page({
  data: {
    conversationId: '',
    itemTitle: '',
    myOpenid: '',
    messages: [],
    inputText: '',
    canSend: false,
    sending: false,
    scrollToView: '',
    loadingMore: false,
    skip: 0,
    limit: 20,
    hasMore: true,
    watcher: null,
    lastMessageTime: '',
    pollingNew: false
  },

  onLoad(options) {
    if (!app.requireLogin()) return;
    const { conversationId, itemTitle, draft } = options;
    const inputText = draft ? decodeURIComponent(draft) : '';
    this.setData({
      conversationId,
      itemTitle: decodeURIComponent(itemTitle || '聊天'),
      inputText,
      canSend: !!inputText.trim(),
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
    if (this.pollTimer) clearInterval(this.pollTimer);
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
      const newest = newMsgs[newMsgs.length - 1];
      // 新消息插入到数组头部
      this.setData({
        messages: [...newMsgs, ...this.data.messages],
        skip: this.data.skip + newMsgs.length,
        hasMore,
        loadingMore: false,
        lastMessageTime: newest ? newest.createTime : this.data.lastMessageTime
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
    try {
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
                    scrollToView: `msg-${newMsg._id}`,
                    lastMessageTime: newMsg.createTime
                  });
                }
              }
            });
          }
        },
        onError: (err) => {
          console.error('监听失败', err);
          this.startPolling();
        }
      });
      this.setData({ watcher });
    } catch (err) {
      console.error('启动监听失败', err);
      this.startPolling();
    }
  },

  startPolling() {
    if (this.pollTimer) return;
    this.pollTimer = setInterval(() => this.loadNewMessages(), 3000);
  },

  async loadNewMessages() {
    if (this.data.pollingNew) return;
    this.setData({ pollingNew: true });
    try {
      const res = await wx.cloud.callFunction({
        name: 'getMessages',
        data: {
          conversationId: this.data.conversationId,
          afterTime: this.data.lastMessageTime || new Date(0).toISOString(),
          limit: 50
        }
      });
      const knownIds = new Set(this.data.messages.map(item => item._id));
      const newMessages = (res.result.messages || []).filter(item => !knownIds.has(item._id));
      newMessages.forEach(item => { item.createTimeFormat = this.formatTime(item.createTime); });
      const newest = newMessages[newMessages.length - 1];
      if (newMessages.length > 0) {
        this.setData({
          messages: this.data.messages.concat(newMessages),
          scrollToView: `msg-${newest._id}`,
          lastMessageTime: newest.createTime
        });
        this.markRead();
      }
    } catch (err) {
      console.error('轮询新消息失败', err);
    } finally {
      this.setData({ pollingNew: false });
    }
  },

  // 输入事件
  onInput(e) {
    const inputText = e.detail.value;
    this.setData({ inputText, canSend: !!inputText.trim() });
  },

  // 发送消息
  async sendMsg() {
    const text = this.data.inputText.trim();
    if (!text || this.data.sending) return;

    this.setData({ sending: true });
    try {
      const res = await wx.cloud.callFunction({
        name: 'sendMessage',
        data: {
          conversationId: this.data.conversationId,
          content: text
        }
      });
      const message = res.result.message;
      if (message && !this.data.messages.some(item => item._id === message._id)) {
        message.createTimeFormat = this.formatTime(message.createTime);
        this.setData({
          messages: this.data.messages.concat(message),
          scrollToView: `msg-${message._id}`,
          lastMessageTime: message.createTime
        });
      }
      this.setData({ inputText: '', canSend: false, sending: false });
    } catch (err) {
      console.error('发送失败', err);
      this.setData({ sending: false });
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
    this.setData({ inputText: `我的微信号：${wechatId}`, canSend: true }, () => this.sendMsg());
  },

  // 时间格式化辅助
  formatTime(date) {
    const d = new Date(date);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }
});
