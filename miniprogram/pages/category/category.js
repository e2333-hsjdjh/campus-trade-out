const app = getApp();

function formatTime(value) {
  const date = new Date(value);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  if (diff < 60 * 60 * 1000) return '刚刚';
  if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / 3600000)}小时前`;
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

Page({
  data: {
    category: '',
    categoryLabel: '',
    schoolId: '',
    schoolName: '',
    conditions: [
      { label: '全部成色', value: '' },
      { label: '全新', value: '全新' },
      { label: '九成新', value: '九成新' },
      { label: '七成新', value: '七成新' },
      { label: '五成新及以下', value: '五成新及以下' }
    ],
    selectedCondition: '',
    sort: 'latest',
    sortLabel: '最新发布',
    items: [],
    total: 0,
    skip: 0,
    limit: 12,
    hasMore: true,
    loading: false
  },

  onLoad(options) {
    if (!app.requireLogin()) return;
    const school = app.getBrowseSchool();
    const category = decodeURIComponent(options.category || '');
    const categoryLabel = decodeURIComponent(options.label || category || '分类好物');
    this.setData({
      category,
      categoryLabel,
      schoolId: school ? school.id : '',
      schoolName: school ? school.name : ''
    });
    wx.setNavigationBarTitle({ title: categoryLabel });
    this.loadItems(true);
  },

  selectCondition(e) {
    if (this.data.loading) return;
    const value = e.currentTarget.dataset.value || '';
    if (value === this.data.selectedCondition) return;
    this.setData({ selectedCondition: value });
    this.loadItems(true);
  },

  chooseSort() {
    const options = [
      { label: '最新发布', value: 'latest' },
      { label: '价格从低到高', value: 'priceAsc' },
      { label: '价格从高到低', value: 'priceDesc' }
    ];
    wx.showActionSheet({
      itemList: options.map(item => item.label),
      success: ({ tapIndex }) => {
        const selected = options[tapIndex];
        if (!selected || selected.value === this.data.sort || this.data.loading) return;
        this.setData({ sort: selected.value, sortLabel: selected.label });
        this.loadItems(true);
      }
    });
  },

  async loadItems(isRefresh = false) {
    if (this.data.loading || !this.data.category || !this.data.schoolId) return;
    this.setData({ loading: true });
    try {
      const skip = isRefresh ? 0 : this.data.skip;
      const res = await wx.cloud.callFunction({
        name: 'getItems',
        data: {
          schoolId: this.data.schoolId,
          category: this.data.category,
          condition: this.data.selectedCondition,
          sort: this.data.sort,
          skip,
          limit: this.data.limit
        }
      });
      const result = res.result || {};
      const newItems = (result.items || []).map(item => ({
        ...item,
        createTimeFormat: formatTime(item.createTime)
      }));
      this.setData({
        items: isRefresh ? newItems : this.data.items.concat(newItems),
        total: result.total || 0,
        skip: skip + newItems.length,
        hasMore: !!result.hasMore,
        loading: false
      });
    } catch (err) {
      console.error('加载分类商品失败', err);
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败，请检查数据库索引', icon: 'none' });
    } finally {
      wx.stopPullDownRefresh();
    }
  },

  onPullDownRefresh() {
    if (this.data.loading) {
      wx.stopPullDownRefresh();
      return;
    }
    this.loadItems(true);
  },

  onReachBottom() {
    if (!this.data.hasMore || this.data.loading) return;
    this.loadItems();
  },

  goDetail(e) {
    wx.navigateTo({ url: `/pages/item-detail/item-detail?id=${e.currentTarget.dataset.id}` });
  },

  goPublish() {
    wx.switchTab({ url: '/pages/publish/publish' });
  }
});
