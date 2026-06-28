# 天使光环点亮工具 - 部署指南

## 🚀 快速部署到 Render.com（免费）

### 步骤 1：准备代码仓库
1. 访问 https://github.com/new 创建一个新仓库（比如 `angel-halo`）
2. 上传以下文件到仓库：
   - `server.js`
   - `package.json`
   - `public/index.html`
   - `public/admin.html`

### 步骤 2：部署到 Render
1. 访问 https://render.com 注册（可以用 GitHub 登录）
2. 点击 "New +" → "Web Service"
3. 连接你的 GitHub 仓库
4. 配置：
   - **Name**: angel-halo（随便取）
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Plan**: Free
5. 点击 "Create Web Service"

等待 2-3 分钟，Render 会给你一个公网地址（如 https://angel-halo.onrender.com），所有人都能访问！

---

## 🔧 本地运行 + 公网暴露（临时方案）

如果你想快速测试，可以用 `localtunnel`（无需注册）：

```bash
# 1. 启动本地服务器
cd angel-halo-web
node server.js

# 2. 新开一个终端，安装并运行 localtunnel
npx localtunnel --port 3000
```

它会给你一个公网地址（如 https://xxx.loca.lt），分享给别人就能访问！

---

## 📱 使用方法

部署成功后：
- **用户页**：`你的地址`（如 https://angel-halo.onrender.com）
- **大屏投影页**：`你的地址/admin.html`（如 https://angel-halo.onrender.com/admin.html）

---

## ⚠️ 注意事项

- Render 免费版会在 15 分钟无活动后休眠，下次访问需要等待 30 秒唤醒
- 如果需要永久在线，可以升级到付费版（$7/月）或使用其他平台
