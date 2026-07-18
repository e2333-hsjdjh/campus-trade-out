const app = getApp();

Page({
  data: {
    images: [],          // 本地临时路径列表，用于展示
    cloudImageIds: [],   // 上传后云存储 fileID 数组
    title: '',
    price: '',
    description: '',
    category: '',
    condition: '',
    categories: ['教材', '电子产品', '生活用品', '服饰', '运动器材', '其他'],
    conditions: ['全新', '九成新', '七成新', '五成新及以下'],
    canSubmit: false
  },

  // 选择图片
  chooseImage() {
    const remain = 9 - this.data.images.length;
    if (remain <= 0) return;
    wx.chooseImage({
      count: remain,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        this.setData({
          images: this.data.images.concat(res.tempFilePaths)
        });
        this.checkCanSubmit();
      }
    });
  },

  // 删除图片
  deleteImage(e) {
    const index = e.currentTarget.dataset.index;
    const images = this.data.images;
    images.splice(index, 1);
    this.setData({ images });
    this.checkCanSubmit();
  },

  // 分类选择
  onCategoryChange(e) {
    this.setData({ category: this.data.categories[e.detail.value] });
    this.checkCanSubmit();
  },

  // 成色选择
  onConditionChange(e) {
    this.setData({ condition: this.data.conditions[e.detail.value] });
    this.checkCanSubmit();
  },

  // 输入框/文本域通用处理
  onInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [field]: e.detail.value });
    this.checkCanSubmit();
  },

  // 检查是否可以提交（基本必填项）
  checkCanSubmit() {
    const { title, price, category, condition, images } = this.data;
    const can = title.trim() && price && category && condition && images.length > 0;
    this.setData({ canSubmit: can });
  },

  // 提交商品
  async submitItem() {
    if (!this.data.canSubmit) return;

    // 先检查登录状态
    if (!app.isLoggedIn()) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '发布中...' });

    try {
      // 1. 上传所有图片到云存储
      const cloudImageIds = await this.uploadImages(this.data.images);
      
      // 2. 调用云函数写入数据库
      const res = await wx.cloud.callFunction({
        name: 'publishItem',
        data: {
          title: this.data.title.trim(),
          price: parseFloat(this.data.price),
          description: this.data.description.trim(),
          category: this.data.category,
          condition: this.data.condition,
          images: cloudImageIds
        }
      });

      wx.hideLoading();
      wx.showToast({ title: '发布成功', icon: 'success' });

      // 清空表单
      this.setData({
        images: [],
        cloudImageIds: [],
        title: '',
        price: '',
        description: '',
        category: '',
        condition: '',
        canSubmit: false
      });

      // 可选：跳转到首页
      setTimeout(() => {
        wx.switchTab({ url: '/pages/index/index' });
      }, 1000);

    } catch (err) {
      wx.hideLoading();
      console.error('发布失败', err);
      wx.showToast({ title: '发布失败，请重试', icon: 'error' });
    }
  },

  // 上传图片辅助函数
  uploadImages(filePaths) {
    const tasks = filePaths.map(filePath => {
      const cloudPath = `items/${Date.now()}-${Math.random().toString(36).slice(2)}.png`;
      return wx.cloud.uploadFile({
        cloudPath,
        filePath
      }).then(res => res.fileID);
    });
    return Promise.all(tasks);
  }
});