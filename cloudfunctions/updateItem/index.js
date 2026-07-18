const cloud = require('wx-server-sdk');

cloud.init();
const db = cloud.database();

exports.main = async (event) => {
  const { OPENID: openid } = cloud.getWXContext();
  const { itemId, title, price, description, category, condition, images } = event;

  if (!itemId) throw new Error('缺少商品ID');
  if (!title || !title.trim() || !category || !condition) {
    throw new Error('请完整填写商品信息');
  }
  if (!Number.isFinite(Number(price)) || Number(price) < 0) {
    throw new Error('请输入有效价格');
  }
  if (!Array.isArray(images) || images.length === 0 || images.length > 9) {
    throw new Error('请保留 1 到 9 张商品图片');
  }

  const itemRes = await db.collection('items').doc(itemId).get();
  if (!itemRes.data) throw new Error('商品不存在');
  if (itemRes.data._openid !== openid) throw new Error('无权修改该商品');

  const data = {
    title: title.trim(),
    price: Number(price),
    description: String(description || '').trim(),
    category,
    condition,
    images,
    updateTime: new Date()
  };

  await db.collection('items').doc(itemId).update({ data });
  return { success: true, item: { _id: itemId, ...data } };
};
