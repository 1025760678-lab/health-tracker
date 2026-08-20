# 饮品记录 iPhone 应用

这是网页版本旁的原生 SwiftUI 应用，支持：

- 将水写入 Apple 健康的“饮水量”
- 将咖啡热量写入“膳食能量”
- 将咖啡因写入“咖啡因”
- 将提醒设置批量同步到 Apple“提醒事项”
- 删除原生记录时，同时删除由该记录创建的健康样本

## 在 Xcode 中运行

1. 安装完整版本的 Xcode 15 或更新版本。
2. 打开 `DrinkTracker.xcodeproj`。
3. 选择 `DrinkTracker` Target，在 Signing & Capabilities 中选择自己的开发团队。
4. 确认 HealthKit capability 已启用。
5. 修改 Bundle Identifier，使其在你的开发团队中唯一。
6. 连接一台 iPhone 后运行；HealthKit 写入必须在支持健康数据的真机上测试。

## 数据说明

原生应用数据保存在 iPhone 的 `UserDefaults`，网页数据保存在浏览器的 `localStorage`。Safari 不允许原生应用直接读取网页的 `localStorage`，因此当前两端不会自动共享旧记录。若需要跨端自动同步，下一版本需要加入 iCloud/CloudKit 或其他账户型数据层。

Apple“提醒事项”的重复规则不支持每 30–120 分钟，因此应用会创建未来 7 天内的独立提醒。每次重新同步会先清理由本应用管理的旧提醒，避免重复。
