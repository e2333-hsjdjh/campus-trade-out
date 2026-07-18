const cloud = require('wx-server-sdk');

cloud.init();
const db = cloud.database();
const command = db.command;

exports.main = async (event) => {
  const { OPENID: openid } = cloud.getWXContext();
  const skip = Math.max(0, Number(event.skip) || 0);
  const limit = Math.min(20, Math.max(1, Number(event.limit) || 20));

  const userRes = await db.collection('users').where({ _openid: openid }).get();
  const user = userRes.data[0];
  if (!user || !user.schoolId) throw new Error('用户未绑定学校');

  const where = { _openid: openid, schoolId: user.schoolId };
  const [favoriteRes, countRes] = await Promise.all([
    db.collection('favorites').where(where).orderBy('createTime', 'desc').skip(skip).limit(limit).get(),
    db.collection('favorites').where(where).count()
  ]);
  const ids = favoriteRes.data.map(item => item.itemId);
  if (ids.length === 0) {
    return { items: [], total: countRes.total, hasMore: false, nextSkip: skip };
  }

  const itemRes = await db.collection('items').where({
    _id: command.in(ids),
    schoolId: user.schoolId
  }).get();
  const itemMap = new Map(itemRes.data.map(item => [item._id, item]));
  const items = favoriteRes.data.map(favorite => {
    const item = itemMap.get(favorite.itemId);
    if (!item) return null;
    const { _openid, ...publicItem } = item;
    return {
      ...publicItem,
      favoriteId: favorite._id,
      favoriteTime: favorite.createTime
    };
  }).filter(Boolean);

  return {
    items,
    total: countRes.total,
    hasMore: skip + favoriteRes.data.length < countRes.total,
    nextSkip: skip + favoriteRes.data.length
  };
};
