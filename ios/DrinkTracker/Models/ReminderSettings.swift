import Foundation

struct ReminderSettings: Codable, Equatable {
    var enabled = false
    var intervalMinutes = 60
    var startHour = 8
    var startMinute = 0
    var endHour = 22
    var endMinute = 0

    var startDate: Date {
        Calendar.current.date(from: DateComponents(hour: startHour, minute: startMinute)) ?? .now
    }

    var endDate: Date {
        Calendar.current.date(from: DateComponents(hour: endHour, minute: endMinute)) ?? .now
    }
}
