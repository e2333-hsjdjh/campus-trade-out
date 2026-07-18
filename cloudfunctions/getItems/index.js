const cloud = require('wx-server-sdk');
cloud.init();
const db = cloud.database();

const ALLOWED_CATEGORIES = ['教材', '电子产品', '生活用品', '服饰', '运动器材', '其他'];
const ALLOWED_CONDITIONS = ['全新', '九成新', '七成新', '五成新及以下'];
const SORT_OPTIONS = {
  latest: { field: 'createTime', direction: 'desc' },
  priceAsc: { field: 'price', direction: 'asc' },
  priceDesc: { field: 'price', direction: 'desc' }
};

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const {
    keyword,
    category,
    condition,
    sort = 'latest',
    schoolId: requestedSchoolId
  } = event;
  const skip = Math.max(0, Number(event.skip) || 0);
  const limit = Math.min(20, Math.max(1, Number(event.limit) || 10));

  if (category && !ALLOWED_CATEGORIES.includes(category)) throw new Error('无效的商品分类');
  if (condition && !ALLOWED_CONDITIONS.includes(condition)) throw new Error('无效的商品成色');
  if (!SORT_OPTIONS[sort]) throw new Error('无效的排序方式');

  // 首页允许访客按所选学校只读浏览；登录用户未显式传学校时使用账号学校。
  let schoolId = requestedSchoolId;
  if (!schoolId) {
    const userRes = await db.collection('users').where({ _openid: openid }).get();
    const user = userRes.data[0];
    if (!user || !user.schoolId) throw new Error('请选择学校');
    schoolId = user.schoolId;
  }

  // 构建查询条件：同校 + 在售
  const where = {
    schoolId,
    status: '在售'
  };

  if (category) where.category = category;
  if (condition) where.condition = condition;

  // 如果有关键词，进行模糊查询（搜索标题）
  if (keyword && keyword.trim()) {
    where.title = db.RegExp({
      regexp: escapeRegExp(keyword.trim().slice(0, 30)),
      options: 'i'   // 忽略大小写
    });
  }

  const order = SORT_OPTIONS[sort];
  const listRes = await db.collection('items')
    .where(where)
    .orderBy(order.field, order.direction)
    .skip(skip)
    .limit(limit)
    .get();

  // 获取总条数（用于判断是否还有更多）
  const countRes = await db.collection('items').where(where).count();

  return {
    items: listRes.data.map(item => {
      const { _openid, ...publicItem } = item;
      return publicItem;
    }),
    total: countRes.total,
    hasMore: skip + listRes.data.length < countRes.total,
    filters: { schoolId, category: category || '', condition: condition || '', sort }
  };
};
