const cloud = require('wx-server-sdk');
cloud.init();
const db = cloud.database();

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const myOpenid = wxContext.OPENID;
  const { conversationId } = event;

  const convRes = await db.collection('conversations').doc(conversationId).get();
  if (!convRes.data || !convRes.data.participants.includes(myOpenid)) {
    throw new Error('无权操作此会话');
  }

  await db.collection('conversations').doc(conversationId).update({
    data: {
      [`unreadCount.${myOpenid}`]: 0
    }
  });
  return {};
};
