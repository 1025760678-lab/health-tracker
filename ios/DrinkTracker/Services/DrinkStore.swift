import Combine
import Foundation

@MainActor
final class DrinkStore: ObservableObject {
    @Published private(set) var records: [DrinkRecord] = []
    @Published var dailyGoalML: Double = 2_000 {
        didSet { saveGoal() }
    }

    private let recordsKey = "native-drink-records"
    private let goalKey = "native-daily-goal"

    init() {
        load()
    }

    var todaysRecords: [DrinkRecord] {
        records
            .filter { Calendar.current.isDateInToday($0.timestamp) }
            .sorted { $0.timestamp > $1.timestamp }
    }

    var totalTodayML: Double {
        todaysRecords.reduce(0) { $0 + $1.amountML }
    }

    func totalToday(for drinkType: DrinkType) -> Double {
        todaysRecords
            .filter { $0.drinkType == drinkType }
            .reduce(0) { $0 + $1.amountML }
    }

    func add(_ record: DrinkRecord) {
        records.append(record)
        saveRecords()
    }

    func attachHealthSamples(_ sampleIDs: [UUID], to recordID: UUID) {
        guard let index = records.firstIndex(where: { $0.id == recordID }) else { return }
        records[index].healthSampleIDs = sampleIDs
        saveRecords()
    }

    func delete(_ record: DrinkRecord) {
        records.removeAll { $0.id == record.id }
        saveRecords()
    }

    private func load() {
        if let data = UserDefaults.standard.data(forKey: recordsKey),
           let decoded = try? JSONDecoder().decode([DrinkRecord].self, from: data) {
            records = decoded
        }

        let savedGoal = UserDefaults.standard.double(forKey: goalKey)
        if savedGoal > 0 { dailyGoalML = savedGoal }
    }

    private func saveRecords() {
        guard let data = try? JSONEncoder().encode(records) else { return }
        UserDefaults.standard.set(data, forKey: recordsKey)
    }

    private func saveGoal() {
        UserDefaults.standard.set(dailyGoalML, forKey: goalKey)
    }
}
