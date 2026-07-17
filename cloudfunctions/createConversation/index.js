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
  const sellerOpenid = itemRes.data._openid;
  if (sellerOpenid === myOpenid) throw new Error('不能和自己聊天');

  // 查询是否已有关于该商品且包含两人的会话
  const convRes = await db.collection('conversations')
    .where({
      itemId: itemId,
      participants: db.command.all([myOpenid, sellerOpenid])
    })
    .get();

  if (convRes.data.length > 0) {
    return { conversationId: convRes.data[0]._id };
  }

  // 创建新会话
  const newConv = {
    participants: [myOpenid, sellerOpenid],
    itemId: itemId,
    createTime: new Date(),
    lastMessage: {},
    unreadCount: {
      [myOpenid]: 0,
      [sellerOpenid]: 0
    }
  };
  const addRes = await db.collection('conversations').add({ data: newConv });
  return { conversationId: addRes._id };
};