# 🎨 DSeed - AI 图片生成平台

一个基于 Next.js 和火山引擎豆包 Seaweed Dream 模型的现代化 AI 图片生成应用，支持文生图、单图生图和多图生图功能。

![DSeed 预览](https://img.shields.io/badge/Next.js-15.5.6-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss)

## ✨ 核心特性

### 🎯 三种生成模式
- **📝 文生图 (Text-to-Image)** - 使用文本描述生成精美图片
- **🖼️ 单图生图 (Image-to-Image)** - 基于单张图片和描述生成新图片
- **🎨 多图生图 (Multi-Image-to-Image)** - 融合多张图片生成独特创意

### 🚀 高级功能
- 🔄 **拖拽排序** - 灵活调整图片生成顺序
- 📚 **历史记录** - 自动保存生成历史，支持快速复用
- ✏️ **继续编辑** - 一键将生成结果用于新的创作
- 📱 **响应式设计** - 完美适配桌面和移动设备
- 🎯 **智能预览** - 实时预览待生成图片
- ☁️ **云端存储** - 集成 Vercel Blob 存储

### 🎛️ 输出控制
- **多分辨率支持**：1K、2K、4K 高清输出
- **个性化设置**：自定义水印开关
- **快速操作**：新标签打开、下载、复制链接

## 🛠️ 技术栈

### 前端框架
- **Next.js 15.5.6** - React 全栈框架
- **React 19** - 最新 React 版本
- **TypeScript** - 类型安全开发
- **Tailwind CSS 4** - 现代化样式框架

### AI & 服务
- **豆包 Seaweed Dream** - 火山引擎 AI 图片生成模型
- **Vercel Blob** - 云端文件存储
- **Vercel 部署** - 一键部署到全球 CDN

### 开发工具
- **ESLint** - 代码质量检查
- **PostCSS** - CSS 处理器
- **pnpm** - 高效包管理器

## 🚀 快速开始

### 环境要求
- Node.js 18+
- pnpm (推荐) 或 npm

### 安装依赖
```bash
# 克隆项目
git clone https://github.com/Cola113/DSeed.git
cd DSeed

# 安装依赖
pnpm install
# 或
npm install
```

### 环境配置
创建 `.env.local` 文件并配置必要的环境变量：

```env
# 火山引擎 API 密钥
VOLC_API_KEY=your_volcengine_api_key_here

# Vercel Blob 配置（部署时自动配置）
BLOB_READ_WRITE_TOKEN=your_blob_token_here
```

### 本地开发
```bash
# 启动开发服务器
pnpm dev
# 或
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000) 开始体验！

## 📖 使用指南

### 1. 文生图模式
1. 选择「文生图」模式
2. 在提示词框中输入详细的图片描述
3. 选择合适的分辨率（1K/2K/4K）
4. 点击「开始生成」

### 2. 单图生图模式
1. 选择「单图生图」模式
2. 上传参考图片或输入图片URL
3. 填写提示词描述期望效果
4. 点击「开始生成」

### 3. 多图生图模式
1. 选择「多图生图」模式
2. 上传多张参考图片或输入多个图片URL
3. 调整图片顺序（支持拖拽）
4. 填写创意描述
5. 点击「开始生成」

## 🎨 功能演示

### 支持的输入方式
- 🖱️ **拖拽上传** - 直接将图片拖拽到上传区域
- 📋 **粘贴复制** - 使用 Ctrl/Command + V 粘贴剪贴板图片
- 🔗 **外链URL** - 直接使用网络图片链接
- 📁 **文件选择** - 传统文件选择器

### 历史记录管理
- 自动保存最近200次生成结果
- 支持快速查看、下载、继续编辑
- 一键清空历史记录

## 🚀 部署指南

### Vercel 部署（推荐）
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Cola113/DSeed.git)

1. 点击上方按钮部署到 Vercel
2. 配置环境变量 `VOLC_API_KEY`
3. 启用 Vercel Blob 存储
4. 完成！🎉

### 其他平台
项目支持部署到任何支持 Next.js 的平台：
- Netlify
- Railway
- AWS Amplify
- 传统 VPS/服务器

## 📝 API 文档

### 生成图片接口
`POST /api/generate`

支持以下参数：
- `mode`: 生成模式 (`text` | `img` | `imgs`)
- `prompt`: 提示词描述
- `size`: 输出分辨率 (`1K` | `2K` | `4K`)
- `files`: 上传文件（多部分表单）
- `imageUrls`: 图片URL数组
- `watermark`: 是否添加水印

### 请求示例
```javascript
const formData = new FormData();
formData.append('mode', 'text');
formData.append('prompt', '一只可爱的小猫在花园里玩耍');
formData.append('size', '2K');

const response = await fetch('/api/generate', {
  method: 'POST',
  body: formData
});

const result = await response.json();
console.log(result.images); // 生成的图片URL数组
```

## 🎯 项目亮点

### 🎨 用户体验
- **渐变背景** - 精美的深色主题界面
- **玻璃拟态** - 现代化的毛玻璃效果
- **流畅动画** - 平滑的交互动画
- **直观操作** - 所见即所得的操作界面

### ⚡ 性能优化
- **Serverless** - 边缘计算，全球加速
- **懒加载** - 按需加载资源
- **缓存策略** - 智能缓存机制
- **CDN分发** - 全球内容分发网络

### 🔧 开发体验
- **TypeScript** - 完整类型定义
- **ESLint** - 代码质量保证
- **热重载** - 快速开发迭代
- **模块化** - 清晰的代码结构

## 🤝 贡献指南

欢迎所有形式的贡献！

### 如何贡献
1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

### 开发规范
- 遵循 TypeScript 严格模式
- 使用 ESLint 进行代码检查
- 提交信息使用语义化格式
- 添加必要的测试用例

## 📄 开源协议

本项目采用 [MIT License](LICENSE) 开源协议。

## 🙏 致谢

- [Next.js](https://nextjs.org/) - 强大的 React 框架
- [Vercel](https://vercel.com/) - 优秀的部署平台
- [Tailwind CSS](https://tailwindcss.com/) - 实用的 CSS 框架
- [火山引擎](https://www.volcengine.com/) - 豆包 AI 模型

## 📞 联系我们

- 🐛 [问题反馈](https://github.com/Cola113/DSeed/issues)
- 💬 [功能建议](https://github.com/Cola113/DSeed/issues)
- ⭐ [Star 支持](https://github.com/Cola113/DSeed)

---

<div align="center">
  <p>使用 ❤️ 和 ☕ 由 <a href="https://github.com/Cola113">Cola113</a> 制作</p>
  <p><strong>DSeed</strong> - 让AI创意无限可能 🎨</p>
</div>