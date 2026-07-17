const cloud = require('wx-server-sdk');
cloud.init();
const db = cloud.database();

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const senderOpenid = wxContext.OPENID;
  const { conversationId, content } = event;

  if (!content || !content.trim()) throw new Error('消息不能为空');

  // 验证发送者是否属于该会话
  const convRes = await db.collection('conversations').doc(conversationId).get();
  const conv = convRes.data;
  if (!conv.participants.includes(senderOpenid)) throw new Error('无权限');

  // 确定接收者 openid
  const receiverOpenid = conv.participants.find(id => id !== senderOpenid);

  const msg = {
    conversationId,
    senderOpenid,
    content: content.trim(),
    createTime: new Date()
  };

  await db.collection('messages').add({ data: msg });

  // 更新会话的最后一条消息，并增加接收者的未读数
  const unreadCount = conv.unreadCount || {};
  const currentUnread = unreadCount[receiverOpenid] || 0;
  await db.collection('conversations').doc(conversationId).update({
    data: {
      lastMessage: {
        content: msg.content,
        sender: senderOpenid,
        time: msg.createTime
      },
      [`unreadCount.${receiverOpenid}`]: currentUnread + 1
    }
  });

  return { msgId: (await db.collection('messages').where({ conversationId }).orderBy('createTime','desc').limit(1).get()).data[0]._id };
};