const cloud = require('wx-server-sdk');
cloud.init();
const db = cloud.database();

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const myOpenid = wxContext.OPENID;
  const { conversationId } = event;

  await db.collection('conversations').doc(conversationId).update({
    data: {
      [`unreadCount.${myOpenid}`]: 0
    }
  });
  return {};
};