const cloud = require('wx-server-sdk');
cloud.init();
const db = cloud.database();

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const senderOpenid = wxContext.OPENID;
  const { conversationId, content } = event;

  if (!conversationId) throw new Error('缺少会话ID');
  if (!content || !content.trim()) throw new Error('消息不能为空');
  if (content.trim().length > 500) throw new Error('消息不能超过500字');

  // 验证发送者是否属于该会话
  const convRes = await db.collection('conversations').doc(conversationId).get();
  const conv = convRes.data;
  if (!conv || !conv.participants.includes(senderOpenid)) throw new Error('无权限');

  // 确定接收者 openid
  const receiverOpenid = conv.participants.find(id => id !== senderOpenid);

  const msg = {
    conversationId,
    participants: conv.participants,
    senderOpenid,
    content: content.trim(),
    createTime: new Date()
  };

  const messageRes = await db.collection('messages').add({ data: msg });

  // 更新会话的最后一条消息，并增加接收者的未读数
  await db.collection('conversations').doc(conversationId).update({
    data: {
      lastMessage: {
        content: msg.content,
        sender: senderOpenid,
        time: msg.createTime
      },
      [`unreadCount.${receiverOpenid}`]: db.command.inc(1)
    }
  });

  return {
    msgId: messageRes._id,
    message: { _id: messageRes._id, ...msg }
  };
};
