const cloud = require('wx-server-sdk');
cloud.init();
const db = cloud.database();

exports.main = async (event) => {
  const { itemId } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  // 获取商品
  const itemRes = await db.collection('items').doc(itemId).get();
  if (!itemRes.data) throw new Error('商品不存在');
  const item = itemRes.data;

  // 获取卖家信息（只返回头像昵称，不暴露 openid）
  const sellerRes = await db.collection('users').where({ _openid: item._openid }).get();
  const seller = sellerRes.data[0] ? {
    nickName: sellerRes.data[0].nickName,
    avatarUrl: sellerRes.data[0].avatarUrl
  } : {};

  // 可选：增加浏览量等

  return { item, seller };
};