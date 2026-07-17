const cloud = require('wx-server-sdk');
cloud.init();
const db = cloud.database();
const _ = db.command;

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { keyword, skip = 0, limit = 10 } = event;

  // 获取当前用户的学校 ID
  const userRes = await db.collection('users').where({ _openid: openid }).get();
  if (userRes.data.length === 0) throw new Error('用户未登录');
  const user = userRes.data[0];
  if (!user.schoolId) throw new Error('用户未绑定学校');

  // 构建查询条件：同校 + 在售
  let where = {
    schoolId: user.schoolId,
    status: '在售'
  };

  // 如果有关键词，进行模糊查询（搜索标题）
  if (keyword && keyword.trim()) {
    where.title = db.RegExp({
      regexp: keyword.trim(),
      options: 'i'   // 忽略大小写
    });
  }

  // 查询商品列表，按创建时间倒序，分页
  const listRes = await db.collection('items')
    .where(where)
    .orderBy('createTime', 'desc')
    .skip(skip)
    .limit(limit)
    .get();

  // 获取总条数（用于判断是否还有更多）
  const countRes = await db.collection('items').where(where).count();

  return {
    items: listRes.data,
    total: countRes.total,
    hasMore: skip + listRes.data.length < countRes.total
  };
};