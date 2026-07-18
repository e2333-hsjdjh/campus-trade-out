const cloud = require('wx-server-sdk');

cloud.init();
const db = cloud.database();

// 返回当前用户自己的商品，避免小程序端直接读取 items 集合。
exports.main = async () => {
  const { OPENID: openid } = cloud.getWXContext();
  const result = await db.collection('items')
    .where({ _openid: openid })
    .orderBy('createTime', 'desc')
    .get();

  return { items: result.data };
};
