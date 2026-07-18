const cloud = require('wx-server-sdk');
cloud.init();
const db = cloud.database();

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const myOpenid = wxContext.OPENID;
  const { conversationId, afterTime } = event;
  const skip = Math.max(0, Number(event.skip) || 0);
  const limit = Math.min(50, Math.max(1, Number(event.limit) || 20));

  // 校验权限：必须是会话参与者
  const convRes = await db.collection('conversations').doc(conversationId).get();
  if (!convRes.data || !convRes.data.participants.includes(myOpenid)) {
    throw new Error('无权访问此会话');
  }

  const where = { conversationId };
  if (afterTime) {
    const afterDate = new Date(afterTime);
    if (!Number.isNaN(afterDate.getTime())) where.createTime = db.command.gt(afterDate);
  }

  const msgs = await db.collection('messages')
    .where(where)
    .orderBy('createTime', 'asc')
    .skip(afterTime ? 0 : skip)
    .limit(limit)
    .get();

  return { messages: msgs.data };
};
