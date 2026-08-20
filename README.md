# Water Intake Tracker

A responsive daily water tracker built with Next.js-compatible React, TypeScript, and Tailwind CSS. Records and the daily goal are saved locally in the browser.

## Start locally

```bash
npm install
npm run dev
```

Then open the local URL shown in the terminal (usually `http://localhost:3000`).

You can also use pnpm:

```bash
pnpm install
pnpm dev
```

## Production build

```bash
npm run build
```

## iPhone 应用

原生 SwiftUI 配套应用位于 `ios/`，支持 Apple HealthKit 和“提醒事项”同步。使用完整 Xcode 打开 `ios/DrinkTracker.xcodeproj`；详细配置参见 `ios/README.md`。
