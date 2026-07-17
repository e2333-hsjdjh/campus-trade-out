const app = getApp();

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

Page({
  data: {
    itemId: '',
    item: null,
    seller: null,
    schoolName: '',
    isOwner: false,
    canContact: false,
    imageIndex: 0,
    loading: false,
    loadError: false,
    contacting: false
  },

  onLoad(options) {
    const itemId = options.id || '';
    const school = app.getBrowseSchool();
    this.setData({ itemId, schoolName: school ? school.name : '' });
    if (!itemId) {
      this.setData({ loadError: true });
      return;
    }
    if (!app.requireLogin()) return;
    this.loadItemDetail();
  },

  onShow() {
    if (app.isLoggedIn() && this.data.itemId && !this.data.item && !this.data.loading && !this.data.loadError) {
      this.loadItemDetail();
    }
  },

  async loadItemDetail() {
    if (this.data.loading || !this.data.itemId) return;
    this.setData({ loading: true, loadError: false });
    try {
      const res = await wx.cloud.callFunction({
        name: 'getItemDetail',
        data: { itemId: this.data.itemId }
      });
      const result = res.result || {};
      const item = result.item;
      if (!item) throw new Error('商品不存在');
      item.createTimeFormat = formatDate(item.createTime);
      item.imageCount = Array.isArray(item.images) ? item.images.length : 0;
      this.setData({
        item,
        seller: result.seller || {},
        isOwner: !!result.isOwner,
        canContact: !result.isOwner && item.status === '在售',
        loading: false
      });
      wx.setNavigationBarTitle({ title: item.title || '商品详情' });
    } catch (err) {
      console.error('加载详情失败', err);
      this.setData({ loading: false, loadError: true });
      wx.showToast({ title: '商品详情加载失败', icon: 'none' });
    }
  },

  onSwiperChange(e) {
    this.setData({ imageIndex: e.detail.current });
  },

  previewImage(e) {
    const images = this.data.item && this.data.item.images;
    if (!images || images.length === 0) return;
    wx.previewImage({
      current: e.currentTarget.dataset.src || images[this.data.imageIndex],
      urls: images
    });
  },

  retryLoad() {
    this.setData({ loadError: false });
    this.loadItemDetail();
  },

  goHome() {
    wx.switchTab({ url: '/pages/index/index' });
  },

  goSafetyGuide() {
    wx.navigateTo({ url: '/pages/safety-guide/safety-guide' });
  },

  manageItem() {
    wx.navigateTo({ url: '/pages/mine/my-items/my-items' });
  },

  async wantItem() {
    if (!this.data.canContact || this.data.contacting) return;
    this.setData({ contacting: true });
    wx.showLoading({ title: '正在建立会话' });
    try {
      const res = await wx.cloud.callFunction({
        name: 'createConversation',
        data: { itemId: this.data.item._id }
      });
      const conversationId = res.result.conversationId;
      wx.hideLoading();
      wx.navigateTo({
        url: `/pages/chat/chat?conversationId=${conversationId}&itemTitle=${encodeURIComponent(this.data.item.title)}`
      });
    } catch (err) {
      wx.hideLoading();
      console.error('创建会话失败', err);
      const message = String(err && err.errMsg || err);
      wx.showToast({
        title: message.includes('FUNCTION_NOT_FOUND') ? '聊天云函数尚未部署' : '暂时无法发起聊天',
        icon: 'none'
      });
    } finally {
      this.setData({ contacting: false });
    }
  },

  onShareAppMessage() {
    const item = this.data.item || {};
    return {
      title: item.title ? `${item.title}｜校园闲置` : '校园闲置好物',
      path: `/pages/item-detail/item-detail?id=${this.data.itemId}`,
      imageUrl: item.images && item.images[0] ? item.images[0] : ''
    };
  }
});
