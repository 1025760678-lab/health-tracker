import Combine
import Foundation
import HealthKit

enum HealthKitError: LocalizedError {
    case unavailable
    case noSupportedData
    case permissionDenied

    var errorDescription: String? {
        switch self {
        case .unavailable: "此设备不支持 Apple 健康数据。"
        case .noSupportedData: "这条记录没有可同步到 Apple 健康的数据。"
        case .permissionDenied: "没有获得写入 Apple 健康的权限。"
        }
    }
}

@MainActor
final class HealthKitManager: ObservableObject {
    @Published private(set) var isAuthorized = false
    @Published private(set) var statusMessage = "尚未连接 Apple 健康"

    private let healthStore = HKHealthStore()

    init() {
        guard HKHealthStore.isHealthDataAvailable() else { return }
        isAuthorized = writableTypes.contains {
            healthStore.authorizationStatus(for: $0) == .sharingAuthorized
        }
        if isAuthorized { statusMessage = "已连接 Apple 健康" }
    }

    private var writableTypes: Set<HKSampleType> {
        [
            HKObjectType.quantityType(forIdentifier: .dietaryWater),
            HKObjectType.quantityType(forIdentifier: .dietaryEnergyConsumed),
            HKObjectType.quantityType(forIdentifier: .dietaryCaffeine),
        ].compactMap { $0 }.reduce(into: Set<HKSampleType>()) { $0.insert($1) }
    }

    func requestAuthorization() async {
        guard HKHealthStore.isHealthDataAvailable() else {
            statusMessage = HealthKitError.unavailable.localizedDescription
            return
        }

        do {
            try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
                healthStore.requestAuthorization(toShare: writableTypes, read: []) { granted, error in
                    if let error { continuation.resume(throwing: error) }
                    else if granted { continuation.resume() }
                    else { continuation.resume(throwing: HealthKitError.permissionDenied) }
                }
            }
            isAuthorized = writableTypes.contains {
                healthStore.authorizationStatus(for: $0) == .sharingAuthorized
            }
            statusMessage = isAuthorized ? "已连接 Apple 健康" : HealthKitError.permissionDenied.localizedDescription
        } catch {
            isAuthorized = false
            statusMessage = error.localizedDescription
        }
    }

    func save(_ record: DrinkRecord) async throws -> [UUID] {
        guard HKHealthStore.isHealthDataAvailable() else { throw HealthKitError.unavailable }
        var samples: [HKQuantitySample] = []
        let metadata: [String: Any] = [
            HKMetadataKeyFoodType: record.displayName,
            HKMetadataKeyExternalUUID: record.id.uuidString,
        ]

        if record.drinkType == .water,
           let waterType = HKObjectType.quantityType(forIdentifier: .dietaryWater) {
            samples.append(
                HKQuantitySample(
                    type: waterType,
                    quantity: HKQuantity(unit: .literUnit(with: .milli), doubleValue: record.amountML),
                    start: record.timestamp,
                    end: record.timestamp,
                    metadata: metadata
                )
            )
        }

        if record.drinkType == .coffee,
           let calories = record.caloriesKcal,
           let energyType = HKObjectType.quantityType(forIdentifier: .dietaryEnergyConsumed) {
            samples.append(
                HKQuantitySample(
                    type: energyType,
                    quantity: HKQuantity(unit: .kilocalorie(), doubleValue: calories),
                    start: record.timestamp,
                    end: record.timestamp,
                    metadata: metadata
                )
            )
        }

        if record.drinkType == .coffee,
           let caffeine = record.caffeineMG,
           let caffeineType = HKObjectType.quantityType(forIdentifier: .dietaryCaffeine) {
            samples.append(
                HKQuantitySample(
                    type: caffeineType,
                    quantity: HKQuantity(unit: .gramUnit(with: .milli), doubleValue: caffeine),
                    start: record.timestamp,
                    end: record.timestamp,
                    metadata: metadata
                )
            )
        }

        guard !samples.isEmpty else { throw HealthKitError.noSupportedData }
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            healthStore.save(samples as [HKObject]) { success, error in
                if let error { continuation.resume(throwing: error) }
                else if success { continuation.resume() }
                else { continuation.resume(throwing: HealthKitError.unavailable) }
            }
        }
        statusMessage = "最近一条记录已同步"
        return samples.map(\.uuid)
    }

    func deleteSamples(with identifiers: [UUID]) async {
        guard !identifiers.isEmpty else { return }
        let predicate = HKQuery.predicateForObjects(with: identifiers)
        let types = [
            HKObjectType.quantityType(forIdentifier: .dietaryWater),
            HKObjectType.quantityType(forIdentifier: .dietaryEnergyConsumed),
            HKObjectType.quantityType(forIdentifier: .dietaryCaffeine),
        ].compactMap { $0 }

        for type in types {
            await withCheckedContinuation { (continuation: CheckedContinuation<Void, Never>) in
                healthStore.deleteObjects(of: type, predicate: predicate) { _, _, _ in
                    continuation.resume()
                }
            }
        }
    }
}
