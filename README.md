# MT论坛 一键回复看隐藏

一个 Tampermonkey / Violentmonkey 用户脚本，为 MT 论坛 (bbs.binmt.cc) 添加可拖拽悬浮按钮，点击自动回复以查看隐藏内容。

## 功能

- 🎯 **自动回复** — 点击蓝色悬浮按钮，自动发送回复并刷新页面
- 🟢 **已回复状态** — 绿色按钮表示已回复，点击直接刷新
- 🖱️ **可拖拽** — 鼠标或触屏均可拖拽，位置自动保存
- 📱 **触屏优化** — 10px 移动阈值，区分点击和拖拽，不会误触
- 🧠 **智能回复** — 15 种回复模板随机选取，30% 概率拼接标题关键词
- ⚡ **降级方案** — AJAX 失败时自动尝试表单提交，再失败则弹窗引导手动回复
- 🔒 **防重复** — 每个帖子回复一次，localStorage 持久化标记

## 安装

1. 安装 Tampermonkey（[Chrome](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) / [Firefox](https://addons.mozilla.org/firefox/addon/tampermonkey/) / [Edge](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd)）
2. 点击以下链接安装脚本：

👉 **[安装脚本](https://raw.githubusercontent.com/Embrace/mt-forum-auto-reply/main/mt-forum-auto-reply.user.js)**

3. 打开任意 MT 论坛帖子（`https://bbs.binmt.cc/thread-*`）即可使用

## 使用

- **蓝色按钮** → 有隐藏内容，点击自动回复
- **绿色按钮** → 已回复过，点击刷新页面
- **拖拽** → 长按拖到任意位置，位置自动保存

## 更新日志

### v2.0
- 触屏 10px 拖拽阈值，告别误触
- 回复模板从 3 个扩展到 15 个
- 30% 概率拼接标题关键词，回复更自然
- 降级方案：AJAX 失败 → 表单提交 → 弹窗引导
- 更好的状态反馈 UI

### v1.8
- 初始版本