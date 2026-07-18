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

  const allIds = Array.isArray(user.favoriteItemIds) ? user.favoriteItemIds.slice().reverse() : [];
  const ids = allIds.slice(skip, skip + limit);
  if (ids.length === 0) {
    return { items: [], total: allIds.length, hasMore: false, nextSkip: skip };
  }

  const itemRes = await db.collection('items').where({
    _id: command.in(ids),
    schoolId: user.schoolId
  }).get();
  const itemMap = new Map(itemRes.data.map(item => [item._id, item]));
  const items = ids.map(itemId => {
    const item = itemMap.get(itemId);
    if (!item) return null;
    const { _openid, ...publicItem } = item;
    return publicItem;
  }).filter(Boolean);

  return {
    items,
    total: allIds.length,
    hasMore: skip + ids.length < allIds.length,
    nextSkip: skip + ids.length
  };
};
