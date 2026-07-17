const cloud = require('wx-server-sdk');
cloud.init();
const db = cloud.database();

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const myOpenid = wxContext.OPENID;
  const { itemId } = event;

  // 获取商品信息及卖家 openid
  const itemRes = await db.collection('items').doc(itemId).get();
  if (!itemRes.data) throw new Error('商品不存在');
  const buyerRes = await db.collection('users').where({ _openid: myOpenid }).get();
  const buyer = buyerRes.data[0];
  if (!buyer || !buyer.schoolId) throw new Error('用户未绑定学校');
  if (itemRes.data.schoolId !== buyer.schoolId) throw new Error('无权联系跨校商品');
  if (itemRes.data.status !== '在售') throw new Error('该商品当前不可联系');
  const sellerOpenid = itemRes.data._openid;
  if (sellerOpenid === myOpenid) throw new Error('不能和自己聊天');

  // 使用稳定的会话键并在事务内创建，避免两次同时点击生成重复会话。
  const participantIds = [myOpenid, sellerOpenid].sort();
  const conversationKey = `${itemId}:${participantIds.join(':')}`;

  const conversationId = await db.runTransaction(async transaction => {
    const convRes = await transaction.collection('conversations')
      .where({ conversationKey })
      .get();
    if (convRes.data.length > 0) return convRes.data[0]._id;

    const addRes = await transaction.collection('conversations').add({
      data: {
        conversationKey,
        participants: participantIds,
        itemId,
        createTime: new Date(),
        lastMessage: {},
        unreadCount: {
          [myOpenid]: 0,
          [sellerOpenid]: 0
        }
      }
    });
    return addRes._id;
  });

  return { conversationId };
};
