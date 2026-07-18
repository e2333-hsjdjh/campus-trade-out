const cloud = require('wx-server-sdk');
cloud.init();
const db = cloud.database();

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { schoolId, nickName, avatarUrl } = event;

  const userRes = await db.collection('users').where({ _openid: openid }).get();
  let user = userRes.data[0];

  if (user) {
    const updateData = {};
    if (nickName) updateData.nickName = nickName;
    if (avatarUrl) updateData.avatarUrl = avatarUrl;
    if (schoolId) updateData.schoolId = schoolId;
    if (Object.keys(updateData).length > 0) {
      await db.collection('users').doc(user._id).update({ data: updateData });
      user = (await db.collection('users').doc(user._id).get()).data;
    }
  } else {
    const newUser = {
      _openid: openid,
      nickName: nickName || '未命名用户',
      avatarUrl: avatarUrl || '',
      schoolId: schoolId,
      verified: true,
      wechatId: '',
      createTime: new Date()
    };
    const addRes = await db.collection('users').add({ data: newUser });
    user = { ...newUser, _id: addRes._id };
  }

  return { openid, user };
};