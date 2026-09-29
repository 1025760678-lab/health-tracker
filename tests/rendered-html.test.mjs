import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the complete Chinese health tracker shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html lang="zh-CN">/i);
  assert.match(html, /<title>Flow — 个人健康与健身记录<\/title>/i);
  assert.match(html, /饮水、训练、饮食与能量状态/);
  assert.match(html, /今天/);
  assert.match(html, /饮水/);
  assert.match(html, /训练/);
  assert.match(html, /饮食/);
  assert.match(html, /\/og\.png/);
  assert.doesNotMatch(html, /Your site is taking shape|Building your site/);
});

test("keeps the four trackers and storage namespaces wired explicitly", async () => {
  const [page, layout, todayDashboard, nutritionStorage, workoutStorage, profileStorage] =
    await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/today/TodayDashboard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/utils/nutritionStorage.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/utils/workoutStorage.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/utils/profileStorage.ts", import.meta.url), "utf8"),
  ]);

  assert.match(page, /TodayDashboard/);
  assert.match(page, /WorkoutDashboard/);
  assert.match(page, /NutritionDashboard/);
  assert.match(page, /activeTracker === "water"/);
  assert.match(todayDashboard, /今日状态/);
  assert.match(todayDashboard, /本周趋势/);
  assert.match(todayDashboard, /今日洞察/);
  assert.match(todayDashboard, /快速记录/);
  assert.match(todayDashboard, /onQuickAddWater/);
  assert.match(todayDashboard, /记录体重/);
  assert.match(layout, /lang="zh-CN"/);
  assert.match(nutritionStorage, /nutritionTracker_data_v1/);
  assert.match(workoutStorage, /workoutTracker_data/);
  assert.match(profileStorage, /bodyProfile_data_v1/);
  assert.match(profileStorage, /weightTracker_records_v1/);
});
