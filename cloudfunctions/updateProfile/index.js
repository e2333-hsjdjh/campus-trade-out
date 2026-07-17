/**
 * 云函数：updateProfile
 * 功能：更新当前用户的昵称、头像、微信号
 * 入参：{ nickName?, avatarUrl?, wechatId? }
 * 返回：{ success: true, user: 更新后的用户对象 }
 */
const cloud = require('wx-server-sdk');
cloud.init();
const db = cloud.database();

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { nickName, avatarUrl, wechatId } = event;

  // 构建要更新的字段（不传的字段不更新）
  const updateData = {};
  if (nickName !== undefined) updateData.nickName = nickName;
  if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;
  if (wechatId !== undefined) updateData.wechatId = wechatId;

  if (Object.keys(updateData).length === 0) {
    return { success: false, message: '没有需要更新的内容' };
  }

  // 查找当前用户
  const userRes = await db.collection('users').where({ _openid: openid }).get();
  if (userRes.data.length === 0) {
    throw new Error('用户不存在，请先登录');
  }

  const userId = userRes.data[0]._id;

  // 更新用户信息
  await db.collection('users').doc(userId).update({
    data: updateData
  });

  // 返回更新后的完整用户信息
  const updatedUser = (await db.collection('users').doc(userId).get()).data;

  return {
    success: true,
    user: updatedUser
  };
};