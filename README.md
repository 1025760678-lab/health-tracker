# Flow 个人健康与健身记录

Flow 是一款移动端优先的个人健康追踪应用，使用 Next.js、React、TypeScript 与 Tailwind CSS 构建。应用不需要后端或登录，饮水、训练、饮食、身体资料和体重记录均保存在当前浏览器的 `localStorage` 中。

## 主要功能

- 今日总览：饮水、训练、餐食与估算能量状态
- 饮水：水、牛奶与多种咖啡，支持容量、热量、目标、历史和提醒
- 力量训练：肌群、动作库、组数、重量、次数、上次表现、个人最佳与历史
- 饮食：早餐、午餐、晚餐与加餐，支持热量录入、编辑、移动、删除和 7 日概览
- 身体资料：BMR、日常基线消耗、训练消耗、热量目标与体重趋势
- 响应式 Liquid Glass 界面，支持浅色、深色和减少动态效果偏好

## 本地启动

需要 Node.js 22.13 或更高版本。

```bash
npm install
npm run dev
```

然后打开终端显示的地址，通常为 `http://localhost:3000`。

也可以使用 pnpm：

```bash
pnpm install
pnpm dev
```

## 验证与生产构建

```bash
npm run lint
npm test
npm run build
```

## iPhone 配套应用

原生 SwiftUI 配套项目位于 `ios/`，负责需要系统权限的 Apple HealthKit 饮水写入与“提醒事项”同步。使用完整 Xcode 打开 `ios/DrinkTracker.xcodeproj`，详细配置参见 `ios/README.md`。
