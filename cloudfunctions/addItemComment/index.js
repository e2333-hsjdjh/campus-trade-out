const cloud = require('wx-server-sdk');

cloud.init();
const db = cloud.database();

exports.main = async (event) => {
  const { OPENID: openid } = cloud.getWXContext();
  const itemId = String(event.itemId || '').trim();
  const content = String(event.content || '').trim();

  if (!itemId) throw new Error('商品参数无效');
  if (!content) throw new Error('请输入评论内容');
  if (Array.from(content).length > 200) throw new Error('评论不能超过200字');

  const [itemRes, userRes] = await Promise.all([
    db.collection('items').doc(itemId).get(),
    db.collection('users').where({ _openid: openid }).get()
  ]);
  const item = itemRes.data;
  const user = userRes.data[0];

  if (!item) throw new Error('商品不存在');
  if (!user || !user.schoolId) throw new Error('请先登录并选择学校');
  if (item.schoolId !== user.schoolId) throw new Error('只能评论同校商品');
  if (item._openid === openid) throw new Error('不能评论自己的商品');
  if (item.status !== '在售') throw new Error('当前商品不可评论');

  const createTime = new Date();
  const comment = {
    _openid: openid,
    itemId,
    schoolId: user.schoolId,
    content,
    author: {
      nickName: user.nickName || '校园同学',
      avatarUrl: user.avatarUrl || '',
      verified: !!user.verified
    },
    createTime
  };
  const addRes = await db.collection('itemComments').add({ data: comment });

  const { _openid, ...publicComment } = comment;
  return {
    success: true,
    comment: {
      _id: addRes._id,
      ...publicComment
    }
  };
};
