import SwiftUI

struct ReminderSettingsView: View {
    @EnvironmentObject private var reminders: ReminderManager
    @State private var enabled = false
    @State private var intervalMinutes = 60
    @State private var startTime = Calendar.current.date(from: DateComponents(hour: 8)) ?? .now
    @State private var endTime = Calendar.current.date(from: DateComponents(hour: 22)) ?? .now

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Label("同步到提醒事项", systemImage: "bell.badge.fill")
                    .font(.headline)
                    .foregroundStyle(.purple)
                Spacer()
                Toggle("同步到提醒事项", isOn: $enabled).labelsHidden()
            }

            Picker("提醒间隔", selection: $intervalMinutes) {
                Text("每 30 分钟").tag(30)
                Text("每 1 小时").tag(60)
                Text("每 1.5 小时").tag(90)
                Text("每 2 小时").tag(120)
            }

            HStack {
                DatePicker("开始", selection: $startTime, displayedComponents: .hourAndMinute)
                DatePicker("结束", selection: $endTime, displayedComponents: .hourAndMinute)
            }
            .font(.subheadline)

            Button {
                sync()
            } label: {
                if reminders.isSyncing {
                    ProgressView().frame(maxWidth: .infinity)
                } else {
                    Text("同步提醒设置").frame(maxWidth: .infinity)
                }
            }
            .buttonStyle(.borderedProminent)
            .disabled(reminders.isSyncing)

            Text(reminders.statusMessage)
                .font(.footnote)
                .foregroundStyle(.secondary)
            Text("系统不支持小时级重复规则，因此应用会生成未来 7 天内的独立提醒。")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .onAppear {
            let settings = reminders.settings
            enabled = settings.enabled
            intervalMinutes = settings.intervalMinutes
            startTime = settings.startDate
            endTime = settings.endDate
        }
    }

    private func sync() {
        let start = Calendar.current.dateComponents([.hour, .minute], from: startTime)
        let end = Calendar.current.dateComponents([.hour, .minute], from: endTime)
        let settings = ReminderSettings(
            enabled: enabled,
            intervalMinutes: intervalMinutes,
            startHour: start.hour ?? 8,
            startMinute: start.minute ?? 0,
            endHour: end.hour ?? 22,
            endMinute: end.minute ?? 0
        )
        Task { await reminders.sync(settings) }
    }
}
