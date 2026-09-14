interface RecipeFood {
  name: string;
  serving: string;
  carbs: number;
  protein: number;
  fat: number;
}

interface RecipeMeal {
  key: string;
  icon: string;
  name: string;
  time: string;
  foods: RecipeFood[];
}

const recipeMeals: RecipeMeal[] = [
  {
    key: "breakfast",
    icon: "☀️",
    name: "早餐",
    time: "07:00–09:00",
    foods: [
      { name: "燕麦", serving: "60 g", carbs: 40, protein: 8, fat: 4 },
      { name: "全蛋", serving: "2 个", carbs: 1, protein: 12, fat: 10 },
      { name: "无糖酸奶", serving: "150 g", carbs: 6, protein: 15, fat: 3 },
      { name: "蓝莓", serving: "80 g", carbs: 10, protein: 1, fat: 0 },
    ],
  },
  {
    key: "lunch",
    icon: "🌤️",
    name: "午餐",
    time: "11:30–13:30",
    foods: [
      { name: "米饭", serving: "150 g", carbs: 52, protein: 4, fat: 1 },
      { name: "香煎鸡胸", serving: "180 g", carbs: 0, protein: 55, fat: 6 },
      { name: "西兰花", serving: "200 g", carbs: 14, protein: 6, fat: 1 },
      { name: "橄榄油", serving: "10 g", carbs: 0, protein: 0, fat: 10 },
    ],
  },
  {
    key: "dinner",
    icon: "🌙",
    name: "晚餐",
    time: "17:30–19:30",
    foods: [
      { name: "烤红薯", serving: "200 g", carbs: 40, protein: 4, fat: 0 },
      { name: "烤三文鱼", serving: "150 g", carbs: 0, protein: 33, fat: 18 },
      { name: "时蔬沙拉", serving: "200 g", carbs: 12, protein: 5, fat: 1 },
      { name: "牛油果", serving: "50 g", carbs: 4, protein: 1, fat: 7 },
    ],
  },
];

function getMealTotals(meal: RecipeMeal) {
  return meal.foods.reduce(
    (totals, food) => ({
      carbs: totals.carbs + food.carbs,
      protein: totals.protein + food.protein,
      fat: totals.fat + food.fat,
    }),
    { carbs: 0, protein: 0, fat: 0 },
  );
}

const dayTotals = recipeMeals.reduce(
  (totals, meal) => {
    const mealTotals = getMealTotals(meal);
    return {
      carbs: totals.carbs + mealTotals.carbs,
      protein: totals.protein + mealTotals.protein,
      fat: totals.fat + mealTotals.fat,
    };
  },
  { carbs: 0, protein: 0, fat: 0 },
);

const estimatedCalories =
  dayTotals.carbs * 4 + dayTotals.protein * 4 + dayTotals.fat * 9;

export function RecipePlan() {
  return (
    <div className="recipe-layout" role="tabpanel" aria-label="食谱">
      <section className="recipe-summary glass-surface" aria-labelledby="recipe-plan-title">
        <div className="nutrition-section-heading recipe-summary-heading">
          <div>
            <p className="nutrition-eyebrow">DAILY RECIPE</p>
            <h2 id="recipe-plan-title">均衡高蛋白一日食谱</h2>
          </div>
          <span className="recipe-plan-badge">示例搭配</span>
        </div>

        <div className="recipe-daily-metrics" aria-label="每日营养估算">
          <div className="recipe-calorie-metric">
            <span>估算热量</span>
            <strong>{estimatedCalories.toLocaleString()}</strong>
            <small>kcal</small>
          </div>
          <div><span>碳水</span><strong>{dayTotals.carbs}</strong><small>g</small></div>
          <div><span>蛋白质</span><strong>{dayTotals.protein}</strong><small>g</small></div>
          <div><span>脂肪</span><strong>{dayTotals.fat}</strong><small>g</small></div>
        </div>

        <p className="recipe-summary-note">
          适合日常均衡饮食的参考搭配，食材重量按可食部分计算。
        </p>
      </section>

      <section className="recipe-meals-section" aria-labelledby="recipe-meals-title">
        <div className="recipe-section-title">
          <div>
            <p className="nutrition-eyebrow">MEAL PLAN</p>
            <h2 id="recipe-meals-title">三餐食物分配</h2>
          </div>
          <p>营养素数值为估算</p>
        </div>

        <div className="recipe-meal-grid">
          {recipeMeals.map((meal) => {
            const totals = getMealTotals(meal);
            return (
              <article className="recipe-meal-card glass-surface" key={meal.key}>
                <header className="recipe-meal-heading">
                  <span className="recipe-meal-icon" aria-hidden="true">{meal.icon}</span>
                  <div>
                    <h3>{meal.name}</h3>
                    <p>{meal.time}</p>
                  </div>
                </header>

                <div className="recipe-table-wrap">
                  <table className="recipe-table">
                    <thead>
                      <tr>
                        <th scope="col">食物</th>
                        <th scope="col">份量</th>
                        <th scope="col">碳水</th>
                        <th scope="col">蛋白</th>
                        <th scope="col">脂肪</th>
                      </tr>
                    </thead>
                    <tbody>
                      {meal.foods.map((food) => (
                        <tr key={food.name}>
                          <th scope="row">{food.name}</th>
                          <td>{food.serving}</td>
                          <td>{food.carbs || "—"}</td>
                          <td>{food.protein || "—"}</td>
                          <td>{food.fat || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <th scope="row" colSpan={2}>小计</th>
                        <td>{totals.carbs}</td>
                        <td>{totals.protein}</td>
                        <td>{totals.fat}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <aside className="recipe-cooking-note glass-surface" aria-label="烹饪建议">
        <span aria-hidden="true">⌘</span>
        <div>
          <strong>烹饪建议</strong>
          <p>优先清蒸、烘烤或少油煎；全日额外烹调油建议不超过 20 g，并根据饥饿感与训练量调整份量。</p>
        </div>
      </aside>

      <p className="recipe-disclaimer">食谱与营养数值仅供日常记录参考，不替代专业营养或医疗建议。</p>
    </div>
  );
}
