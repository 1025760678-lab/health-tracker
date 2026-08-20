import Combine
import EventKit
import Foundation

enum ReminderSyncError: LocalizedError {
    case permissionDenied
    case noReminderSource
    case invalidTimeRange

    var errorDescription: String? {
        switch self {
        case .permissionDenied: "没有获得提醒事项权限。"
        case .noReminderSource: "无法找到可用的提醒事项列表。"
        case .invalidTimeRange: "提醒结束时间需要晚于开始时间。"
        }
    }
}

@MainActor
final class ReminderManager: ObservableObject {
    @Published private(set) var settings = ReminderSettings()
    @Published private(set) var statusMessage = "尚未同步到提醒事项"
    @Published private(set) var isSyncing = false

    private let eventStore = EKEventStore()
    private let settingsKey = "native-reminder-settings"
    private let calendarTitle = "饮水提醒"
    private let managedMarker = "DrinkTrackerManagedReminder"
    private var managedNote: String { "由“饮品记录”自动创建\n\(managedMarker)" }

    init() {
        if let data = UserDefaults.standard.data(forKey: settingsKey),
           let decoded = try? JSONDecoder().decode(ReminderSettings.self, from: data) {
            settings = decoded
        }
    }

    func sync(_ newSettings: ReminderSettings) async {
        isSyncing = true
        defer { isSyncing = false }

        do {
            let startMinutes = newSettings.startHour * 60 + newSettings.startMinute
            let endMinutes = newSettings.endHour * 60 + newSettings.endMinute
            if newSettings.enabled && startMinutes >= endMinutes {
                throw ReminderSyncError.invalidTimeRange
            }
            try await requestAccess()
            try await removeManagedReminders()
            if newSettings.enabled {
                try createReminders(for: newSettings, numberOfDays: 7)
                statusMessage = "未来 7 天的提醒已同步"
            } else {
                statusMessage = "提醒事项同步已关闭"
            }
            settings = newSettings
            saveSettings()
        } catch {
            statusMessage = error.localizedDescription
        }
    }

    private func requestAccess() async throws {
        let granted = try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Bool, Error>) in
            eventStore.requestFullAccessToReminders { granted, error in
                if let error { continuation.resume(throwing: error) }
                else { continuation.resume(returning: granted) }
            }
        }
        if !granted { throw ReminderSyncError.permissionDenied }
    }

    private func reminderCalendar() throws -> EKCalendar {
        if let existing = eventStore.calendars(for: .reminder).first(where: { $0.title == calendarTitle }) {
            return existing
        }

        guard let source = eventStore.defaultCalendarForNewReminders()?.source else {
            throw ReminderSyncError.noReminderSource
        }
        let calendar = EKCalendar(for: .reminder, eventStore: eventStore)
        calendar.title = calendarTitle
        calendar.source = source
        try eventStore.saveCalendar(calendar, commit: true)
        return calendar
    }

    private func removeManagedReminders() async throws {
        let reminders = await withCheckedContinuation { (continuation: CheckedContinuation<[EKReminder], Never>) in
            eventStore.fetchReminders(matching: nil) { reminders in
                continuation.resume(returning: reminders ?? [])
            }
        }

        for reminder in reminders where reminder.notes?.contains(managedMarker) == true {
            try eventStore.remove(reminder, commit: false)
        }
        try eventStore.commit()
    }

    private func createReminders(for settings: ReminderSettings, numberOfDays: Int) throws {
        let calendar = try reminderCalendar()
        let systemCalendar = Calendar.current

        for dayOffset in 0..<numberOfDays {
            guard let day = systemCalendar.date(byAdding: .day, value: dayOffset, to: .now),
                  let start = systemCalendar.date(
                    bySettingHour: settings.startHour,
                    minute: settings.startMinute,
                    second: 0,
                    of: day
                  ),
                  let end = systemCalendar.date(
                    bySettingHour: settings.endHour,
                    minute: settings.endMinute,
                    second: 0,
                    of: day
                  ) else { continue }

            var reminderDate = start
            while reminderDate < end {
                if reminderDate > .now {
                    let reminder = EKReminder(eventStore: eventStore)
                    reminder.calendar = calendar
                    reminder.title = "该补充水分啦"
                    reminder.notes = managedNote
                    reminder.priority = 5
                    reminder.dueDateComponents = systemCalendar.dateComponents(
                        [.year, .month, .day, .hour, .minute],
                        from: reminderDate
                    )
                    reminder.addAlarm(EKAlarm(absoluteDate: reminderDate))
                    try eventStore.save(reminder, commit: false)
                }
                guard let nextDate = systemCalendar.date(
                    byAdding: .minute,
                    value: settings.intervalMinutes,
                    to: reminderDate
                ) else { break }
                reminderDate = nextDate
            }
        }
        try eventStore.commit()
    }

    private func saveSettings() {
        guard let data = try? JSONEncoder().encode(settings) else { return }
        UserDefaults.standard.set(data, forKey: settingsKey)
    }
}
