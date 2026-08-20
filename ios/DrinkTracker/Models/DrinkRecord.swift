import Foundation

enum DrinkType: String, Codable, CaseIterable, Identifiable {
    case water
    case milk
    case coffee

    var id: String { rawValue }

    var title: String {
        switch self {
        case .water: "水"
        case .milk: "牛奶"
        case .coffee: "咖啡"
        }
    }

    var symbol: String {
        switch self {
        case .water: "drop.fill"
        case .milk: "cup.and.saucer.fill"
        case .coffee: "mug.fill"
        }
    }
}

enum CoffeeType: String, Codable, CaseIterable, Identifiable {
    case americano
    case latte
    case luckinCoconutLatte = "luckin-coconut-latte"
    case luckinGoldRoastAmericano = "luckin-gold-roast-americano"
    case gumingFreshMilkLatte = "guming-fresh-milk-latte"

    var id: String { rawValue }
    var title: String {
        switch self {
        case .americano: "美式咖啡"
        case .latte: "拿铁咖啡"
        case .luckinCoconutLatte: "瑞幸 · 生椰拿铁"
        case .luckinGoldRoastAmericano: "瑞幸 · 金烘美式"
        case .gumingFreshMilkLatte: "古茗 · 鲜奶拿铁"
        }
    }
}

struct DrinkRecord: Codable, Identifiable {
    let id: UUID
    let amountML: Double
    let drinkType: DrinkType
    let coffeeType: CoffeeType?
    let caloriesKcal: Double?
    let caffeineMG: Double?
    let timestamp: Date
    var healthSampleIDs: [UUID]

    var displayName: String {
        if drinkType == .coffee { return coffeeType?.title ?? drinkType.title }
        return drinkType.title
    }
}
