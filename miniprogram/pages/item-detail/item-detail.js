const app = getApp();

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

function formatCommentTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '刚刚';
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  if (diff >= 0 && diff < 60 * 1000) return '刚刚';
  if (diff >= 0 && diff < 60 * 60 * 1000) return `${Math.floor(diff / 60000)}分钟前`;
  if (diff >= 0 && diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / 3600000)}小时前`;
  if (date.getFullYear() === now.getFullYear()) return `${date.getMonth() + 1}月${date.getDate()}日`;
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

function formatComments(comments) {
  return (Array.isArray(comments) ? comments : []).map(comment => ({
    ...comment,
    createTimeFormat: formatCommentTime(comment.createTime)
  }));
}

function normalizeImages(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [value];
  } catch (err) {
    return [value];
  }
}

Page({
  data: {
    itemId: '',
    item: null,
    seller: null,
    schoolName: '',
    isOwner: false,
    isFavorited: false,
    canContact: false,
    canComment: false,
    imageIndex: 0,
    loading: false,
    loadError: false,
    contacting: false,
    updatingStatus: false,
    favoriteUpdating: false,
    comments: [],
    commentCount: 0,
    commentText: '',
    canSubmitComment: false,
    commentSubmitting: false
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
    if (app.isLoggedIn() && this.data.itemId && !this.data.loading && !this.data.loadError) {
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
      item.images = normalizeImages(item.images);
      item.createTimeFormat = formatDate(item.createTime);
      item.imageCount = Array.isArray(item.images) ? item.images.length : 0;
      this.setData({
        item,
        seller: result.seller || {},
        isOwner: !!result.isOwner,
        isFavorited: !!result.isFavorited,
        canContact: !result.isOwner && item.status === '在售',
        canComment: !!result.isOwner || item.status === '在售',
        comments: formatComments(result.comments),
        commentCount: Number(result.commentCount || 0),
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

  editItem() {
    wx.navigateTo({ url: `/pages/edit-item/edit-item?id=${this.data.itemId}` });
  },

  async toggleFavorite() {
    if (this.data.isOwner || this.data.favoriteUpdating) return;
    const favorited = !this.data.isFavorited;
    this.setData({ favoriteUpdating: true });
    try {
      const res = await wx.cloud.callFunction({
        name: 'toggleFavorite',
        data: { itemId: this.data.itemId, favorited }
      });
      this.setData({
        isFavorited: !!res.result.favorited,
        favoriteUpdating: false
      });
      wx.showToast({
        title: favorited ? '已收藏' : '已取消收藏',
        icon: 'success'
      });
    } catch (err) {
      console.error('更新收藏状态失败', err);
      const message = String((err && err.errMsg) || err);
      wx.showToast({
        title: message.includes('FUNCTION_NOT_FOUND') ? '请先部署收藏云函数' : '收藏操作失败',
        icon: 'none'
      });
      this.setData({ favoriteUpdating: false });
    }
  },

  markSold() {
    this.confirmStatusChange('已售出', '标记为已售出', '确认该商品已经完成交易吗？');
  },

  delistItem() {
    this.confirmStatusChange('已下架', '下架商品', '下架后其他同学将无法继续购买，确认下架吗？');
  },

  relistItem() {
    this.confirmStatusChange('在售', '重新上架', '重新上架后商品会再次展示给同校同学，确认继续吗？');
  },

  confirmStatusChange(status, title, content) {
    if (!this.data.isOwner || this.data.updatingStatus) return;
    wx.showModal({
      title,
      content,
      confirmText: '确认',
      success: ({ confirm }) => {
        if (confirm) this.updateItemStatus(status);
      }
    });
  },

  async updateItemStatus(status) {
    if (this.data.updatingStatus) return;
    this.setData({ updatingStatus: true });
    wx.showLoading({ title: '正在更新' });
    try {
      await wx.cloud.callFunction({
        name: 'updateItemStatus',
        data: { itemId: this.data.itemId, status }
      });
      wx.hideLoading();
      wx.showToast({
        title: status === '在售' ? '已重新上架' : status,
        icon: 'success'
      });
      this.setData({ updatingStatus: false });
      this.loadItemDetail();
    } catch (err) {
      wx.hideLoading();
      console.error('更新商品状态失败', err);
      const message = String((err && err.errMsg) || err);
      wx.showToast({
        title: message.includes('FUNCTION_NOT_FOUND') ? '请先部署状态更新云函数' : '状态更新失败',
        icon: 'none'
      });
      this.setData({ updatingStatus: false });
    }
  },

  leaveMessage() {
    this.openConversation();
  },

  wantItem() {
    this.openConversation('你好，请问这个商品还在吗？');
  },

  async openConversation(draft = '') {
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
      const draftQuery = draft ? `&draft=${encodeURIComponent(draft)}` : '';
      wx.navigateTo({
        url: `/pages/chat/chat?conversationId=${conversationId}&itemTitle=${encodeURIComponent(this.data.item.title)}${draftQuery}`
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

  onCommentInput(e) {
    const commentText = e.detail.value || '';
    this.setData({
      commentText,
      canSubmitComment: !!commentText.trim()
    });
  },

  async submitComment() {
    const content = this.data.commentText.trim();
    if (!this.data.canComment || !content || this.data.commentSubmitting) return;
    this.setData({ commentSubmitting: true });
    try {
      const res = await wx.cloud.callFunction({
        name: 'addItemComment',
        data: { itemId: this.data.itemId, content }
      });
      const comment = res.result && res.result.comment;
      if (!comment) throw new Error('评论发布失败');
      this.setData({
        comments: [formatComments([comment])[0], ...this.data.comments],
        commentCount: this.data.commentCount + 1,
        commentText: '',
        canSubmitComment: false,
        commentSubmitting: false
      });
      wx.showToast({ title: '评论已发布', icon: 'success' });
    } catch (err) {
      console.error('发布评论失败', err);
      const message = String((err && err.errMsg) || err);
      let title = '评论发布失败';
      if (message.includes('FUNCTION_NOT_FOUND')) title = '请先部署评论云函数';
      if (message.includes('itemComments') || message.includes('DATABASE_COLLECTION_NOT_EXIST')) title = '请先创建评论集合';
      wx.showToast({ title, icon: 'none' });
      this.setData({ commentSubmitting: false });
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
