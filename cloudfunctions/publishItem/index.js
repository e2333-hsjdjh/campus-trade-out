const cloud = require('wx-server-sdk');
cloud.init();
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { title, price, description, category, condition, images } = event;

  // 获取用户信息，取得学校ID
  const userRes = await db.collection('users').where({ _openid: openid }).get();
  if (userRes.data.length === 0) {
    throw new Error('用户不存在，请先登录');
  }
  const user = userRes.data[0];
  if (!user.schoolId) {
    throw new Error('用户未绑定学校');
  }
  if (!title || !title.trim() || !category || !condition) {
    throw new Error('请完整填写商品信息');
  }
  if (!Number.isFinite(Number(price)) || Number(price) < 0) {
    throw new Error('请输入有效价格');
  }
  if (!Array.isArray(images) || images.length === 0 || images.length > 9) {
    throw new Error('请上传 1 到 9 张商品图片');
  }

  const item = {
    _openid: openid,
    title: title.trim(),
    price: Number(price),
    description: description || '',
    images: images || [],
    category,
    condition,
    schoolId: user.schoolId,     // 自动绑定发布者的学校
    status: '在售',
    createTime: new Date(),
    updateTime: new Date()
  };

  const res = await db.collection('items').add({ data: item });
  return { id: res._id, ...item };
};
