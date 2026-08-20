import SwiftUI

struct AddDrinkView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var store: DrinkStore
    @EnvironmentObject private var healthKit: HealthKitManager

    @State private var drinkType = DrinkType.water
    @State private var coffeeType = CoffeeType.americano
    @State private var amountText = "250"
    @State private var caloriesText = ""
    @State private var caffeineText = ""
    @State private var errorMessage = ""

    var body: some View {
        NavigationStack {
            Form {
                Section("饮品种类") {
                    Picker("饮品", selection: $drinkType) {
                        ForEach(DrinkType.allCases) { type in
                            Label(type.title, systemImage: type.symbol).tag(type)
                        }
                    }
                    .pickerStyle(.segmented)
                }

                if drinkType == .coffee {
                    Section("咖啡设置") {
                        Picker("咖啡种类", selection: $coffeeType) {
                            ForEach(CoffeeType.allCases) { type in
                                Text(type.title).tag(type)
                            }
                        }
                        TextField("热量（千卡，可选）", text: $caloriesText)
                            .keyboardType(.decimalPad)
                        TextField("咖啡因（mg，可选）", text: $caffeineText)
                            .keyboardType(.decimalPad)
                    }
                }

                Section("容量") {
                    TextField("容量（ml）", text: $amountText)
                        .keyboardType(.decimalPad)
                    HStack {
                        Button("250 ml") { amountText = "250" }
                        Spacer()
                        Button("500 ml") { amountText = "500" }
                    }
                }

                if !errorMessage.isEmpty {
                    Section {
                        Text(errorMessage).foregroundStyle(.red)
                    }
                }

                Section {
                    Button("保存记录") { save() }
                        .frame(maxWidth: .infinity)
                        .font(.headline)
                }
            }
            .navigationTitle("添加饮品")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("取消") { dismiss() }
                }
            }
        }
    }

    private func save() {
        guard let amount = Double(amountText), amount > 0, amount <= 10_000 else {
            errorMessage = "请输入有效的饮品容量。"
            return
        }
        let calories = caloriesText.isEmpty ? nil : Double(caloriesText)
        let caffeine = caffeineText.isEmpty ? nil : Double(caffeineText)
        if (caloriesText.isEmpty == false && calories == nil) ||
            (caffeineText.isEmpty == false && caffeine == nil) {
            errorMessage = "热量和咖啡因需要填写数字。"
            return
        }

        let record = DrinkRecord(
            id: UUID(),
            amountML: amount,
            drinkType: drinkType,
            coffeeType: drinkType == .coffee ? coffeeType : nil,
            caloriesKcal: drinkType == .coffee ? calories : nil,
            caffeineMG: drinkType == .coffee ? caffeine : nil,
            timestamp: .now,
            healthSampleIDs: []
        )
        store.add(record)

        if healthKit.isAuthorized && (drinkType == .water || calories != nil || caffeine != nil) {
            Task {
                if let identifiers = try? await healthKit.save(record) {
                    store.attachHealthSamples(identifiers, to: record.id)
                }
            }
        }
        dismiss()
    }
}
