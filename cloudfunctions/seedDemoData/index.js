const cloud = require('wx-server-sdk');

cloud.init();
const db = cloud.database();

const CONFIRMATION = 'CREATE_RUC_SUZHOU_DEMO_DATA';
const SCHOOL_ID = 'ruc_suzhou';
const SELLER_OPENID = 'demo_seller_ruc_suzhou_001';
const SELLER_ID = 'demo_seller_ruc_suzhou_001';
const ITEM_ID = 'demo_item_ruc_suzhou_keyboard_001';
const SELLER_KEY = 'ruc_suzhou_demo_seller_v1';
const ITEM_KEY = 'ruc_suzhou_demo_keyboard_v1';

exports.main = async (event) => {
  if (event.confirm !== CONFIRMATION) throw new Error('缺少测试数据初始化确认');

  const now = new Date();
  const sellerData = {
    _openid: SELLER_OPENID,
    demoKey: SELLER_KEY,
    nickName: '苏园好物铺（测试）',
    avatarUrl: '/images/default-avatar.png',
    schoolId: SCHOOL_ID,
    verified: true,
    isDemo: true,
    wechatId: '',
    phoneNumberMasked: '',
    bio: '中国人民大学苏州校区虚拟测试商家',
    createTime: now
  };

  const itemData = {
    _openid: SELLER_OPENID,
    demoKey: ITEM_KEY,
    isDemo: true,
    title: '九成新蓝牙键盘（演示商品）',
    price: 49,
    description: '这是用于测试首页、商品详情、收藏、评论和聊天入口的演示商品，不进行真实交易。键盘外观整洁，蓝牙连接正常，附带充电线，校内公共区域面交。',
    images: ['/images/categories/digital.png'],
    category: '电子产品',
    condition: '九成新',
    schoolId: SCHOOL_ID,
    status: '在售',
    createTime: now,
    updateTime: now
  };

  // 固定文档 ID 可避免页面生命周期并发调用时产生重复数据。
  const [sellerRes, itemRes] = await Promise.all([
    db.collection('users').where({ demoKey: SELLER_KEY }).get(),
    db.collection('items').where({ demoKey: ITEM_KEY }).get()
  ]);
  const oldSellerIds = sellerRes.data.map(item => item._id).filter(id => id !== SELLER_ID);
  const oldItemIds = itemRes.data.map(item => item._id).filter(id => id !== ITEM_ID);

  await Promise.all([
    db.collection('users').doc(SELLER_ID).set({ data: sellerData }),
    db.collection('items').doc(ITEM_ID).set({ data: itemData }),
    ...oldSellerIds.map(id => db.collection('users').doc(id).remove()),
    ...oldItemIds.map(id => db.collection('items').doc(id).remove())
  ]);

  return {
    success: true,
    created: itemRes.data.length === 0,
    sellerCreated: sellerRes.data.length === 0,
    sellerId: SELLER_ID,
    itemId: ITEM_ID,
    removedDuplicateSellers: oldSellerIds.length,
    removedDuplicateItems: oldItemIds.length,
    seller: sellerData.nickName,
    item: itemData.title
  };
};
