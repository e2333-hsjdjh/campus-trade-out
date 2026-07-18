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
    statusBarHeight: 20,
    menuSafeRight: 0,
    schoolName: '选择学校',
    selectedSchoolId: '',
    schoolModalVisible: false,
    allSchools: [],
    filteredSchools: [],
    schoolSearchKey: '',
    categories: [
      { key: '教材', image: '/images/categories/textbook.png', label: '教材书籍' },
      { key: '电子产品', image: '/images/categories/digital.png', label: '数码电子' },
      { key: '生活用品', image: '/images/categories/dorm.png', label: '宿舍生活' },
      { key: '服饰', image: '/images/categories/fashion.png', label: '服饰穿搭' },
      { key: '运动器材', image: '/images/categories/sports.png', label: '运动户外' },
      { key: '其他', image: '/images/categories/other.png', label: '其他闲置' }
    ],
    items: [],
    sort: 'latest',
    sortLabel: '最新发布',
    skip: 0,
    limit: 10,
    hasMore: true,
    loading: false,
    refreshing: false
  },

  onLoad() {
    const windowInfo = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    let menuSafeRight = 0;
    try {
      const menuRect = wx.getMenuButtonBoundingClientRect && wx.getMenuButtonBoundingClientRect();
      if (menuRect && menuRect.left) {
        // 品牌行与右上角胶囊处在同一高度，预留胶囊所在区域。
        menuSafeRight = Math.max(0, windowInfo.windowWidth - menuRect.left + 8);
      }
    } catch (err) {
      console.warn('无法读取胶囊按钮位置', err);
    }
    this.setData({
      statusBarHeight: windowInfo.statusBarHeight || 20,
      menuSafeRight,
      allSchools: app.globalData.schoolList,
      filteredSchools: app.globalData.schoolList
    });
  },

  onShow() {
    const school = app.getBrowseSchool();
    if (!school) {
      this.setData({ schoolModalVisible: true, items: [] });
      return;
    }

    const schoolChanged = school.id !== this.data.selectedSchoolId;
    const shouldPrompt = !app.isLoggedIn() && !app.globalData.schoolPromptShown;
    this.setData({
      selectedSchoolId: school.id,
      schoolName: school.name,
      schoolModalVisible: shouldPrompt
    });
    if (schoolChanged || this.data.items.length === 0) this.loadItems(true);
  },

  openSchoolSelector() {
    if (app.isLoggedIn()) {
      wx.showToast({ title: '学校已与账号绑定', icon: 'none' });
      return;
    }
    app.globalData.schoolPromptShown = true;
    this.setData({
      schoolModalVisible: true,
      schoolSearchKey: '',
      filteredSchools: this.data.allSchools
    });
  },

  onSearchSchool(e) {
    const key = e.detail.value.trim().toLowerCase();
    const filteredSchools = this.data.allSchools.filter(item =>
      item.name.toLowerCase().includes(key)
    );
    this.setData({ schoolSearchKey: key, filteredSchools });
  },

  selectSchool(e) {
    const school = app.selectBrowseSchool(e.currentTarget.dataset.id);
    if (!school) return;
    this.setData({
      selectedSchoolId: school.id,
      schoolName: school.name,
      schoolModalVisible: false,
      items: [],
      skip: 0,
      hasMore: true
    });
    this.loadItems(true);
  },

  goSafetyGuide() {
    if (!app.requireLogin()) return;
    wx.navigateTo({ url: '/pages/safety-guide/safety-guide' });
  },

  chooseSort() {
    if (!app.requireLogin()) return;
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

  goSearch() {
    if (!app.requireLogin()) return;
    wx.navigateTo({ url: '/pages/search/search' });
  },

  goCategory(e) {
    if (!app.requireLogin()) return;
    const key = e.currentTarget.dataset.key;
    const category = this.data.categories.find(item => item.key === key);
    if (!category) return;
    wx.navigateTo({
      url: `/pages/category/category?category=${encodeURIComponent(category.key)}&label=${encodeURIComponent(category.label)}`
    });
  },

  goDetail(e) {
    if (!app.requireLogin()) return;
    wx.navigateTo({ url: `/pages/item-detail/item-detail?id=${e.currentTarget.dataset.id}` });
  },

  goPublish() {
    if (!app.requireLogin('/pages/publish/publish')) return;
    wx.switchTab({ url: '/pages/publish/publish' });
  },

  async loadItems(isRefresh = false) {
    if (this.data.loading || !this.data.selectedSchoolId) return;
    this.setData({ loading: true });

    try {
      const skip = isRefresh ? 0 : this.data.skip;
      const res = await wx.cloud.callFunction({
        name: 'getItems',
        data: {
          schoolId: this.data.selectedSchoolId,
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
        skip: skip + newItems.length,
        hasMore: !!result.hasMore,
        loading: false,
        refreshing: false
      });
    } catch (err) {
      console.error('加载商品失败', err);
      this.setData({ loading: false, refreshing: false });
      wx.showToast({ title: '商品列表暂时不可用', icon: 'none' });
    }
  },

  onRefresh() {
    if (this.data.loading) {
      this.setData({ refreshing: false });
      return;
    }
    this.setData({ refreshing: true, skip: 0 });
    this.loadItems(true);
  },

  loadMore() {
    if (!this.data.hasMore || this.data.loading) return;
    this.loadItems();
  }
});
