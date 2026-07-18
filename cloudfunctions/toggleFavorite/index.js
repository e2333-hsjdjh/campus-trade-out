const cloud = require('wx-server-sdk');

cloud.init();
const db = cloud.database();

exports.main = async (event) => {
  const { OPENID: openid } = cloud.getWXContext();
  const { itemId, favorited } = event;

  if (!itemId || typeof favorited !== 'boolean') throw new Error('收藏参数无效');

  const [itemRes, userRes] = await Promise.all([
    db.collection('items').doc(itemId).get(),
    db.collection('users').where({ _openid: openid }).get()
  ]);
  const item = itemRes.data;
  const user = userRes.data[0];
  if (!item) throw new Error('商品不存在');
  if (!user || !user.schoolId) throw new Error('用户未绑定学校');
  if (item.schoolId !== user.schoolId) throw new Error('只能收藏同校商品');
  if (item._openid === openid) throw new Error('不能收藏自己的商品');

  const where = { _openid: openid, itemId };
  const existing = await db.collection('favorites').where(where).get();

  if (favorited && existing.data.length === 0) {
    await db.collection('favorites').add({
      data: {
        _openid: openid,
        itemId,
        schoolId: user.schoolId,
        createTime: new Date()
      }
    });
  } else if (!favorited && existing.data.length > 0) {
    await db.collection('favorites').where(where).remove();
  }

  return { success: true, favorited };
};
