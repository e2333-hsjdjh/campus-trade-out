const app = getApp();

Page({
  data: {
    itemId: '',
    images: [],
    title: '',
    price: '',
    description: '',
    category: '',
    condition: '',
    categories: ['教材', '电子产品', '生活用品', '服饰', '运动器材', '其他'],
    conditions: ['全新', '九成新', '七成新', '五成新及以下'],
    canSubmit: false,
    loading: true,
    submitting: false
  },

  onLoad(options) {
    const itemId = options.id || '';
    this.setData({ itemId });
    if (!itemId || !app.requireLogin()) {
      this.setData({ loading: false });
      if (!itemId) wx.showToast({ title: '缺少商品信息', icon: 'none' });
      return;
    }
    this.loadItem();
  },

  async loadItem() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'getItemDetail',
        data: { itemId: this.data.itemId }
      });
      const result = res.result || {};
      if (!result.item || !result.isOwner) throw new Error('无权修改该商品');
      const item = result.item;
      this.setData({
        images: Array.isArray(item.images) ? item.images : [],
        title: item.title || '',
        price: String(item.price == null ? '' : item.price),
        description: item.description || '',
        category: item.category || '',
        condition: item.condition || '',
        loading: false
      });
      this.checkCanSubmit();
    } catch (err) {
      console.error('加载待编辑商品失败', err);
      this.setData({ loading: false });
      wx.showToast({ title: '商品加载失败', icon: 'none' });
    }
  },

  chooseImage() {
    const remain = 9 - this.data.images.length;
    if (remain <= 0) return;
    wx.chooseImage({
      count: remain,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        this.setData({ images: this.data.images.concat(res.tempFilePaths) });
        this.checkCanSubmit();
      }
    });
  },

  deleteImage(e) {
    const images = this.data.images.slice();
    images.splice(Number(e.currentTarget.dataset.index), 1);
    this.setData({ images });
    this.checkCanSubmit();
  },

  onCategoryChange(e) {
    this.setData({ category: this.data.categories[e.detail.value] });
    this.checkCanSubmit();
  },

  onConditionChange(e) {
    this.setData({ condition: this.data.conditions[e.detail.value] });
    this.checkCanSubmit();
  },

  onInput(e) {
    this.setData({ [e.currentTarget.dataset.field]: e.detail.value });
    this.checkCanSubmit();
  },

  checkCanSubmit() {
    const { title, price, category, condition, images, submitting } = this.data;
    this.setData({
      canSubmit: !!(title.trim() && price !== '' && category && condition && images.length > 0 && !submitting)
    });
  },

  isCloudFile(path) {
    return /^cloud:\/\//.test(path);
  },

  uploadNewImages(images) {
    return Promise.all(images.map((filePath) => {
      if (this.isCloudFile(filePath)) return Promise.resolve(filePath);
      const suffix = /\.([a-zA-Z0-9]+)(?:\?|$)/.exec(filePath);
      const ext = suffix ? suffix[1] : 'jpg';
      const cloudPath = `items/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      return wx.cloud.uploadFile({ cloudPath, filePath }).then(res => res.fileID);
    }));
  },

  async saveItem() {
    if (!this.data.canSubmit || this.data.submitting) return;
    this.setData({ submitting: true, canSubmit: false });
    wx.showLoading({ title: '保存中...' });
    try {
      const images = await this.uploadNewImages(this.data.images);
      await wx.cloud.callFunction({
        name: 'updateItem',
        data: {
          itemId: this.data.itemId,
          title: this.data.title.trim(),
          price: Number(this.data.price),
          description: this.data.description.trim(),
          category: this.data.category,
          condition: this.data.condition,
          images
        }
      });
      wx.hideLoading();
      wx.showToast({ title: '修改成功', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 700);
    } catch (err) {
      wx.hideLoading();
      console.error('修改商品失败', err);
      const message = String((err && err.errMsg) || err);
      wx.showToast({
        title: message.includes('FUNCTION_NOT_FOUND') ? '请先部署 updateItem 云函数' : '保存失败，请重试',
        icon: 'none'
      });
      this.setData({ submitting: false });
      this.checkCanSubmit();
    }
  }
});
