import SwiftUI

struct ContentView: View {
    @EnvironmentObject private var store: DrinkStore
    @EnvironmentObject private var healthKit: HealthKitManager
    @EnvironmentObject private var reminders: ReminderManager
    @State private var showingAddDrink = false

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVStack(spacing: 16) {
                    progressCard
                    healthCard
                    reminderCard
                    historyCard
                }
                .padding()
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("饮品摄入记录")
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        showingAddDrink = true
                    } label: {
                        Label("添加饮品", systemImage: "plus.circle.fill")
                    }
                }
            }
            .sheet(isPresented: $showingAddDrink) {
                AddDrinkView()
            }
        }
        .tint(.cyan)
    }

    private var progressCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("今日饮品摄入")
                .font(.caption.bold())
                .foregroundStyle(.cyan)
            HStack(alignment: .firstTextBaseline) {
                Text(store.totalTodayML, format: .number.precision(.fractionLength(0)))
                    .font(.system(size: 42, weight: .bold, design: .rounded))
                Text("/ \(Int(store.dailyGoalML)) ml")
                    .foregroundStyle(.secondary)
            }
            GeometryReader { geometry in
                HStack(spacing: 0) {
                    ForEach(DrinkType.allCases) { drinkType in
                        Rectangle()
                            .fill(progressColor(for: drinkType))
                            .frame(width: segmentWidth(for: drinkType, availableWidth: geometry.size.width))
                    }
                }
                .background(Color.cyan.opacity(0.12))
                .clipShape(Capsule())
            }
            .frame(height: 12)

            HStack(spacing: 8) {
                ForEach(DrinkType.allCases) { drinkType in
                    HStack(spacing: 6) {
                        Circle()
                            .fill(progressColor(for: drinkType))
                            .frame(width: 9, height: 9)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(drinkType.title)
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                            Text("\(Int(store.totalToday(for: drinkType))) ml")
                                .font(.caption.bold())
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(8)
                    .background(progressColor(for: drinkType).opacity(0.08), in: RoundedRectangle(cornerRadius: 10))
                }
            }
        }
        .trackerCard()
    }

    private func segmentWidth(for drinkType: DrinkType, availableWidth: Double) -> Double {
        guard store.totalTodayML > 0 else { return 0 }
        let filledRatio = min(store.totalTodayML / store.dailyGoalML, 1)
        let drinkRatio = store.totalToday(for: drinkType) / store.totalTodayML
        return availableWidth * filledRatio * drinkRatio
    }

    private func progressColor(for drinkType: DrinkType) -> Color {
        switch drinkType {
        case .water: .cyan
        case .milk: Color(red: 0.94, green: 0.85, blue: 0.66)
        case .coffee: Color(red: 0.55, green: 0.37, blue: 0.24)
        }
    }

    private var healthCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Label("Apple 健康", systemImage: "heart.fill")
                    .font(.headline)
                    .foregroundStyle(.pink)
                Spacer()
                Button(healthKit.isAuthorized ? "已连接" : "连接") {
                    Task { await healthKit.requestAuthorization() }
                }
                .buttonStyle(.bordered)
                .disabled(healthKit.isAuthorized)
            }
            Text(healthKit.statusMessage)
                .font(.footnote)
                .foregroundStyle(.secondary)
            Text("水会写入饮水量；咖啡热量和咖啡因分别写入膳食能量与咖啡因。")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .trackerCard()
    }

    private var reminderCard: some View {
        ReminderSettingsView()
            .environmentObject(reminders)
            .trackerCard()
    }

    private var historyCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("今日记录").font(.headline)
                Spacer()
                Text("\(store.todaysRecords.count) 条")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            if store.todaysRecords.isEmpty {
                ContentUnavailableView("还没有饮品记录", systemImage: "drop", description: Text("点击右上角添加第一杯饮品"))
            } else {
                ForEach(store.todaysRecords) { record in
                    DrinkRecordRow(record: record)
                    if record.id != store.todaysRecords.last?.id { Divider() }
                }
            }
        }
        .trackerCard()
    }
}

private struct DrinkRecordRow: View {
    @EnvironmentObject private var store: DrinkStore
    @EnvironmentObject private var healthKit: HealthKitManager
    let record: DrinkRecord

    private var supportsHealthSync: Bool {
        record.drinkType == .water ||
        (record.drinkType == .coffee && (record.caloriesKcal != nil || record.caffeineMG != nil))
    }

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: record.drinkType.symbol)
                .frame(width: 38, height: 38)
                .background(.cyan.opacity(0.12), in: Circle())
                .foregroundStyle(.cyan)
            VStack(alignment: .leading, spacing: 3) {
                Text("\(record.displayName) · \(Int(record.amountML)) ml")
                    .font(.subheadline.bold())
                HStack(spacing: 6) {
                    Text(record.timestamp, format: .dateTime.hour().minute())
                    if let calories = record.caloriesKcal { Text("\(Int(calories)) 千卡") }
                    if let caffeine = record.caffeineMG { Text("\(Int(caffeine)) mg 咖啡因") }
                    if !record.healthSampleIDs.isEmpty {
                        Image(systemName: "heart.circle.fill").foregroundStyle(.pink)
                    }
                }
                .font(.caption)
                .foregroundStyle(.secondary)
            }
            Spacer()

            if supportsHealthSync && record.healthSampleIDs.isEmpty && healthKit.isAuthorized {
                Button("同步") {
                    Task {
                        if let identifiers = try? await healthKit.save(record) {
                            store.attachHealthSamples(identifiers, to: record.id)
                        }
                    }
                }
                .font(.caption.bold())
            }

            Button(role: .destructive) {
                Task {
                    await healthKit.deleteSamples(with: record.healthSampleIDs)
                    store.delete(record)
                }
            } label: {
                Image(systemName: "trash")
            }
            .buttonStyle(.plain)
        }
    }
}

private extension View {
    func trackerCard() -> some View {
        self
            .padding(18)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(.background, in: RoundedRectangle(cornerRadius: 22, style: .continuous))
            .shadow(color: .cyan.opacity(0.08), radius: 16, y: 8)
    }
}
