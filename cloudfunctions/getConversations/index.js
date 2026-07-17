const cloud = require('wx-server-sdk');
cloud.init();
const db = cloud.database();

exports.main = async () => {
  const wxContext = cloud.getWXContext();
  const myOpenid = wxContext.OPENID;

  // 查询当前用户参与的所有会话，按最后消息时间倒序
  const convs = await db.collection('conversations')
    .where({
      participants: db.command.in([myOpenid])
    })
    .orderBy('lastMessage.time', 'desc')
    .get();

  // 在服务端补齐对方的公开资料，前端不再直接读取 users 集合。
  const conversations = await Promise.all(convs.data.map(async conv => {
    const partnerOpenid = conv.participants.find(id => id !== myOpenid);
    const userRes = await db.collection('users').where({ _openid: partnerOpenid }).get();
    const itemRes = await db.collection('items').doc(conv.itemId).get().catch(() => ({ data: null }));
    const user = userRes.data[0];
    return {
      ...conv,
      partner: user ? {
        nickName: user.nickName,
        avatarUrl: user.avatarUrl
      } : { nickName: '未知用户', avatarUrl: '' },
      itemTitle: itemRes.data ? itemRes.data.title : '商品咨询',
      unreadCount: (conv.unreadCount && conv.unreadCount[myOpenid]) || 0
    };
  }));

  return { conversations };
};
