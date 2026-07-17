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

  return { conversations: convs.data };
};