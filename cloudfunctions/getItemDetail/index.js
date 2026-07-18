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

  // 商品详情仅对同校用户可见，避免通过猜测 ID 跨校读取商品信息。
  const viewerRes = await db.collection('users').where({ _openid: openid }).get();
  const viewer = viewerRes.data[0];
  if (!viewer || !viewer.schoolId) throw new Error('用户未绑定学校');
  if (item.schoolId !== viewer.schoolId) throw new Error('无权查看该商品');

  // 获取卖家信息（只返回头像昵称，不暴露 openid）
  const sellerRes = await db.collection('users').where({ _openid: item._openid }).get();
  const seller = sellerRes.data[0] ? {
    nickName: sellerRes.data[0].nickName,
    avatarUrl: sellerRes.data[0].avatarUrl,
    verified: !!sellerRes.data[0].verified
  } : {};

  let isFavorited = false;
  if (item._openid !== openid) {
    const favoriteRes = await db.collection('favorites').where({
      _openid: openid,
      itemId
    }).count();
    isFavorited = favoriteRes.total > 0;
  }

  let comments = [];
  let commentCount = 0;
  try {
    const [commentRes, countRes] = await Promise.all([
      db.collection('itemComments').where({ itemId }).limit(100).get(),
      db.collection('itemComments').where({ itemId }).count()
    ]);
    comments = commentRes.data
      .sort((a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime())
      .slice(0, 30)
      .map(({ _openid: commentOpenid, ...comment }) => comment);
    commentCount = countRes.total;
  } catch (err) {
    const message = String((err && (err.errMsg || err.message)) || err);
    if (!message.includes('DATABASE_COLLECTION_NOT_EXIST') && !message.includes('Db or Table not exist')) {
      throw err;
    }
  }

  // 可选：增加浏览量等

  const { _openid, ...publicItem } = item;
  return {
    item: publicItem,
    seller,
    isOwner: item._openid === openid,
    isFavorited,
    comments,
    commentCount
  };
};
