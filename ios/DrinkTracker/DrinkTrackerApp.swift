import SwiftUI

@main
struct DrinkTrackerApp: App {
    @StateObject private var store = DrinkStore()
    @StateObject private var healthKit = HealthKitManager()
    @StateObject private var reminders = ReminderManager()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(store)
                .environmentObject(healthKit)
                .environmentObject(reminders)
        }
    }
}
