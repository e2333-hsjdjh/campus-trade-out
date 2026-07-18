# 校园闲置交易小程序

这是一个使用微信小程序原生框架和微信云开发实现的同校二手交易项目。目前默认只开放“中国人民大学苏州校区”。

项目包含访客浏览、微信登录、商品发布与状态管理、搜索分类、收藏、评论、买卖双方聊天、未读消息、个人资料和用户主页。

本文重点说明：把代码复制到另一台电脑、另一个文件夹或另一个微信小程序账号后，怎样从零完成部署。

## 一、项目目录

```text
campus-trade-out/
├── project.config.json       微信开发者工具项目配置，包含 AppID 和目录配置
├── miniprogram/              小程序前端
│   ├── app.js                云环境 ID、学校列表和登录状态
│   ├── app.json              页面与底部导航配置
│   ├── images/               本地图片和图标
│   └── pages/                所有页面
└── cloudfunctions/           所有云函数
```

导入微信开发者工具时，应选择项目根目录 `campus-trade-out/`，不要只选择 `miniprogram/`。

## 二、复制代码前后要做什么

### 1. 复制项目

把整个项目目录复制到目标位置。以下内容不需要复制：

- `.git/`：如果不需要保留原仓库历史
- 各云函数中的 `node_modules/`：部署时选择云端安装依赖
- 微信开发者工具生成的临时缓存

必须保留 `project.config.json`、`miniprogram/` 全部文件，以及 `cloudfunctions/` 中全部云函数和各自的 `package.json`。

### 2. 准备微信小程序和云环境

你需要提前准备：

1. 一个已注册的微信小程序 AppID。
2. 已安装的[微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)。
3. 在微信开发者工具中开通一个云开发环境。
4. 记录新云环境的环境 ID，例如 `cloud1-xxxxxxxx`。

如果只是复制到另一台电脑，但仍使用原小程序 AppID 和原云环境，可以继续使用原配置；如果部署到新的小程序账号或新云环境，必须完成下一节的替换。

## 三、替换 AppID 和云环境 ID

### 1. 修改 AppID

打开根目录的 `project.config.json`，修改：

```json
{
  "appid": "你自己的小程序AppID"
}
```

当前仓库中的 AppID 属于原项目，部署到其他小程序账号时不能继续使用。

### 2. 修改云环境 ID

打开 `miniprogram/app.js`，找到：

```js
wx.cloud.init({
  env: 'cloud1-d8gctnpc38f1b09ce',
  traceUser: true,
});
```

把 `env` 替换为新环境 ID。修改后可以全局搜索旧 ID，确认没有遗漏：

```bash
rg "cloud1-d8gctnpc38f1b09ce"
```

正常情况下，旧环境 ID 只配置在 `miniprogram/app.js`。云函数使用 `cloud.init()`，部署到哪个环境就访问哪个环境，不需要逐个写环境 ID。

### 3. 在开发者工具中选择云环境

1. 使用微信开发者工具导入项目根目录。
2. 确认工具顶部显示正确的小程序 AppID。
3. 点击“云开发”，选择刚创建的云环境。
4. 在左侧 `cloudfunctions` 云函数根目录上选择同一个环境。

如果出现“请在编辑器云函数根目录选择一个云环境”，说明第 4 步尚未完成。

## 四、配置学校

当前 `miniprogram/app.js` 只开放：

```js
schoolList: [
  { id: 'ruc_suzhou', name: '中国人民大学苏州校区' },
]
```

如果仍只服务中国人民大学苏州校区，不需要修改。若以后增加学校，应保证用户、商品和会话使用同一套稳定的 `schoolId`，并在上线前测试跨校数据隔离。

`seedDemoData` 中的测试数据固定属于 `ruc_suzhou`，更换学校后不要直接使用这批演示数据。

## 五、创建数据库集合

进入“云开发 → 数据库”，手动创建以下 5 个集合。集合不存在时，云函数会出现 `DATABASE_COLLECTION_NOT_EXIST`。

| 集合 | 用途 | 主要字段 |
| --- | --- | --- |
| `users` | 用户资料和收藏 | `_openid`、`nickName`、`avatarUrl`、`schoolId`、`wechatId`、`favoriteItemIds` |
| `items` | 商品 | `_openid`、`title`、`price`、`images`、`category`、`condition`、`schoolId`、`status` |
| `conversations` | 商品会话 | `conversationKey`、`participants`、`itemId`、`schoolId`、`unreadCount`、`updateTime` |
| `messages` | 聊天消息 | `conversationId`、`participants`、`senderOpenid`、`content`、`createTime` |
| `itemComments` | 商品评论 | `itemId`、`content`、`author`、`createTime` |

不要创建 `favorites` 集合。当前版本将收藏商品 ID 保存在 `users.favoriteItemIds` 数组中。

新集合可以先保持为空，用户第一次登录和发布商品后会由云函数写入数据。

## 六、创建数据库索引

正式部署前建议创建以下索引。若控制台提示缺少索引，以错误提示中的字段和顺序为准补建。

### `items`

- `schoolId` 升序 + `status` 升序 + `createTime` 降序
- `schoolId` 升序 + `status` 升序 + `price` 升序
- `schoolId` 升序 + `status` 升序 + `price` 降序
- `schoolId` 升序 + `status` 升序 + `category` 升序 + `createTime` 降序
- `schoolId` 升序 + `status` 升序 + `category` 升序 + `condition` 升序 + `createTime` 降序
- `_openid` 升序 + `createTime` 降序

### `conversations`

- `conversationKey` 升序
- `participants` 数组索引 + `updateTime` 降序

### `messages`

- `conversationId` 升序 + `createTime` 升序
- `participants` 数组索引 + `createTime` 升序（实时监听需要时按控制台提示创建）

### `itemComments`

- `itemId` 升序

索引状态变为“正常”后再进行完整测试。

## 七、部署云函数

`cloudfunctions/` 下共有 17 个函数。正式业务必须部署除 `seedDemoData` 外的 16 个函数；`seedDemoData` 只在需要演示数据时部署：

```text
addItemComment
createConversation
getConversations
getFavorites
getItemDetail
getItems
getMessages
getMyItems
login
markRead
publishItem
seedDemoData
sendMessage
toggleFavorite
updateItem
updateItemStatus
updateProfile
```

推荐部署顺序：

1. `login`
2. `getItems`、`getItemDetail`、`publishItem`、`getMyItems`
3. `updateItem`、`updateItemStatus`
4. `getFavorites`、`toggleFavorite`
5. `addItemComment`
6. `createConversation`、`getConversations`、`getMessages`、`sendMessage`、`markRead`
7. `updateProfile`
8. `seedDemoData`（仅用于可选演示数据）

每个云函数的部署方法：

1. 在微信开发者工具左侧展开 `cloudfunctions`。
2. 右键一个云函数目录。
3. 选择“上传并部署：云端安装依赖（不上传 node_modules）”。
4. 等待上传成功。
5. 在“云开发 → 云函数”中确认函数状态为“已部署”。

所有云函数都使用 `wx-server-sdk@~4.0.2`。出现“未安装依赖 wx-server-sdk”提示时，应选择“云端安装依赖”，不要上传本地残缺依赖。

如果出现 `FUNCTION_NOT_FOUND`，通常表示对应云函数没有上传、上传到了错误环境，或者前端环境 ID 与开发者工具选择的环境不一致。

## 八、数据库安全规则

不要把数据库设置为“所有用户可读写”。大部分数据库访问都通过云函数完成。

| 集合 | 客户端权限建议 | 说明 |
| --- | --- | --- |
| `users` | 禁止客户端直接读写 | 避免泄露微信号等资料 |
| `items` | 禁止客户端直接写入 | 浏览、发布和修改通过云函数 |
| `conversations` | 禁止客户端直接读写 | 参与者和未读数由云函数维护 |
| `itemComments` | 禁止客户端直接写入 | 评论通过 `addItemComment` 写入 |
| `messages` | 仅会话参与者可读取，禁止客户端写入 | 聊天页需要客户端 `watch`；发送仍通过云函数 |

`messages` 的读取规则需要表达“当前用户 OpenID 包含在 `doc.participants` 中”。不同控制台版本的规则语法可能不同，请使用当前控制台的规则示例。

保存规则后至少用两个账号测试：买卖双方能读取同一会话，第三方账号不能读取，客户端也不能绕过云函数直接写消息或修改商品。

## 九、云存储配置

项目会把商品图片上传到 `items/`，把用户头像上传到 `avatars/`。

进入“云开发 → 存储 → 权限设置”，确认登录用户能够上传图片，需要展示图片的用户能够读取图片。

图片失败时检查当前用户是否登录、云环境是否正确、存储权限是否允许上传和读取，以及文件是否超过限制。

## 十、可选：生成演示商家和商品

正式迁移不需要执行这一节。只有希望快速检查首页和详情页时才执行。

1. 先创建 `users` 和 `items` 集合。
2. 上传并部署 `seedDemoData`。
3. 在云开发控制台打开该函数的云端测试。
4. 输入：

```json
{
  "confirm": "CREATE_RUC_SUZHOU_DEMO_DATA"
}
```

执行后会创建虚拟商家“苏园好物铺（测试）”和商品“九成新蓝牙键盘（演示商品）”，学校为 `ruc_suzhou`。

该函数使用固定文档 ID，并会清理相同 `demoKey` 的旧重复测试数据。虚拟商家不能接收真实微信消息，不要用于真实交易。

## 十一、首次部署后的验收顺序

### 1. 编译和首页

- 开发者工具能够正常编译，没有 `invalid page.json`。
- 首页显示“中国人民大学苏州校区”。
- 未登录时可以上下滑动浏览。

### 2. 登录

- 点击商品、搜索、分类、发布、消息或“我的”会进入登录页。
- 登录后 `users` 集合出现当前用户记录。
- 用户的 `schoolId` 为 `ruc_suzhou`。

### 3. 发布和商品详情

- 发布一件带图片的测试商品。
- `items` 集合出现数据，`images` 应为数组。
- 首页和详情页能够加载商品。
- 卖家可以编辑、标记已售、下架和重新上架。

### 4. 收藏和评论

- 买家收藏后，自己的 `users.favoriteItemIds` 出现商品 ID。
- “我的收藏”能够看到商品。
- 买家和卖家都可以评论，`itemComments` 出现记录。

### 5. 聊天

- 买家从商品详情进入聊天。
- `conversations` 出现会话，`messages` 出现消息。
- 买卖双方能看到实时消息和未读数。
- 同一买家对同一商品重复点击不会创建多个会话。

### 6. 权限隔离

- 其他学校账号不能读取该商品详情。
- 非卖家不能编辑或修改商品状态。
- 非会话参与者不能读取聊天消息。

## 十二、常见错误

### `FunctionName parameter could not be found`

对应云函数未部署，或部署到了错误环境。重新选择正确云环境并上传该函数。

### `database collection not exists`

错误信息中提到的集合没有创建：`users` 会影响登录，`items` 会影响发布和首页，`itemComments` 会影响评论，`conversations` 或 `messages` 会影响聊天。

当前版本不依赖 `favorites` 集合。如果错误仍提到 `favorites`，说明云端的 `getItemDetail`、`getFavorites` 或 `toggleFavorite` 还是旧版本，需要重新上传最新代码。

### 云函数提示缺少 `wx-server-sdk`

右键云函数，选择“上传并部署：云端安装依赖（不上传 node_modules）”。

### 商品图片路径变成 `[` 或图片无法加载

历史数据可能把 `images` 保存成 JSON 字符串。当前前端会兼容读取，但新数据应始终保存为数组。必要时删除错误测试数据后重新发布。

### 商品详情提示“商品暂时无法展示”

检查 `getItemDetail` 是否为最新版、用户是否登录并绑定学校、商品与用户的 `schoolId` 是否一致、商品是否已删除，以及控制台是否提示缺少集合。

### 发布成功但首页看不到

检查商品的 `schoolId`、`status`（必须为 `在售`）、`createTime`，并确认 `getItems` 已部署且所需索引状态正常。

## 十三、部署前代码检查

在项目根目录执行 JavaScript 语法检查：

```bash
for f in cloudfunctions/*/index.js miniprogram/pages/*/*.js miniprogram/pages/mine/*/*.js miniprogram/app.js; do
  node --check "$f" || exit 1
done
```

检查所有 JSON：

```bash
find miniprogram cloudfunctions -name '*.json' -not -path '*/node_modules/*' -print0 | \
  xargs -0 -n1 node -e 'JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"))'
```

最后在微信开发者工具中清缓存并重新编译，用模拟器测试核心流程，再用两个真实微信账号进行真机权限和实时消息测试，然后上传体验版或正式发布。

## 十四、最短部署清单

- [ ] 复制整个项目目录
- [ ] 使用项目根目录导入微信开发者工具
- [ ] 修改 `project.config.json` 中的 AppID
- [ ] 修改 `miniprogram/app.js` 中的云环境 ID
- [ ] 在云函数根目录选择目标云环境
- [ ] 创建 `users`、`items`、`conversations`、`messages`、`itemComments`
- [ ] 创建必要索引
- [ ] 上传 16 个正式业务云函数，选择云端安装依赖
- [ ] 如需演示数据，再上传并执行 `seedDemoData`
- [ ] 配置数据库安全规则
- [ ] 配置云存储权限
- [ ] 清缓存并重新编译
- [ ] 测试登录、发布、详情、收藏、评论和聊天
- [ ] 使用两个账号验证权限和实时消息
- [ ] 上传体验版或正式发布

## 已知限制

- 学校认证目前是示例实现，尚未接入校园邮箱或统一身份认证。
- 当前默认只开放中国人民大学苏州校区。
- 商品搜索使用标题正则匹配，数据量增大后应改用搜索服务。
- 实时聊天依赖云数据库 `watch`，需要关注监听数量、配额和安全规则。
- 演示商家没有真实微信身份，不能进行真实聊天或交易。
