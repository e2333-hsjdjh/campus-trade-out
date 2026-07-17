const cloud = require('wx-server-sdk');
cloud.init();
const db = cloud.database();

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { itemId, status } = event;

  // 校验状态值
  const validStatus = ['已售出', '已下架', '在售'];
  if (!validStatus.includes(status)) {
    throw new Error('无效的状态值');
  }

  // 查询商品，确保是发布者本人操作
  const itemRes = await db.collection('items').doc(itemId).get();
  if (!itemRes.data) throw new Error('商品不存在');
  if (itemRes.data._openid !== openid) throw new Error('无权操作');

  // 更新状态
  await db.collection('items').doc(itemId).update({
    data: {
      status: status,
      updateTime: new Date()
    }
  });

  return { success: true };
};