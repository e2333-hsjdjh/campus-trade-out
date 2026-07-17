const cloud = require('wx-server-sdk');
cloud.init();
const db = cloud.database();

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { schoolId, nickName, avatarUrl, phoneCode } = event;

  if (!schoolId) {
    throw new Error('请选择学校');
  }

  let phoneNumberMasked = '';
  let resolvedNickName = nickName && nickName.trim();
  if (phoneCode) {
    const phoneResult = await cloud.openapi.phonenumber.getPhoneNumber({
      code: phoneCode
    });
    const phoneNumber = phoneResult.phoneInfo && phoneResult.phoneInfo.phoneNumber;
    if (!phoneNumber) {
      throw new Error('手机号授权失败');
    }
    phoneNumberMasked = phoneNumber.replace(/^(\d{3})\d+(\d{4})$/, '$1****$2');
    if (!resolvedNickName) {
      resolvedNickName = `同学${phoneNumber.slice(-4)}`;
    }
  }

  const userRes = await db.collection('users').where({ _openid: openid }).get();
  let user = userRes.data[0];

  if (user) {
    const updateData = {};
    if (resolvedNickName) updateData.nickName = resolvedNickName;
    if (avatarUrl) updateData.avatarUrl = avatarUrl;
    if (schoolId) updateData.schoolId = schoolId;
    if (phoneNumberMasked) updateData.phoneNumberMasked = phoneNumberMasked;
    if (Object.keys(updateData).length > 0) {
      await db.collection('users').doc(user._id).update({ data: updateData });
      user = (await db.collection('users').doc(user._id).get()).data;
    }
  } else {
    const newUser = {
      _openid: openid,
      nickName: resolvedNickName || '未命名用户',
      avatarUrl: avatarUrl || '',
      schoolId: schoolId,
      verified: true,
      wechatId: '',
      phoneNumberMasked,
      createTime: new Date()
    };
    const addRes = await db.collection('users').add({ data: newUser });
    user = { ...newUser, _id: addRes._id };
  }

  return { openid, user };
};
