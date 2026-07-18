const cloud = require('wx-server-sdk');
cloud.init();
const db = cloud.database();

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const myOpenid = wxContext.OPENID;
  const { conversationId, skip = 0, limit = 20 } = event;

  // 校验权限：必须是会话参与者
  const convRes = await db.collection('conversations').doc(conversationId).get();
  if (!convRes.data || !convRes.data.participants.includes(myOpenid)) {
    throw new Error('无权访问此会话');
  }

  const msgs = await db.collection('messages')
    .where({ conversationId })
    .orderBy('createTime', 'asc')
    .skip(skip)
    .limit(limit)
    .get();

  return { messages: msgs.data };
};