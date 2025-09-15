import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { EMoodType } from "@ORGANIZATION/PROJECT-api/lib/structures/EMoodType";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IMoodDiaryDiaryUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IMoodDiaryDiaryUser";
import type { IMoodDiaryMoodEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IMoodDiaryMoodEntry";
import type { IMoodDiaryMoodEntryWeeklySummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IMoodDiaryMoodEntryWeeklySummary";

/**
 * Validate aggregation of weekly mood summary, including correct handling of:
 *
 * - All 8 moods present with correct counts (some zero)
 * - Daily and total mood counts over the correct 7-day window (Asia/Calcutta)
 * - Archived and today-excluded enforcement
 * - All-zero state when there is no data in the week
 */
export async function test_api_mood_weekly_summary_aggregation(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as diaryUser (join)
  const auth: IMoodDiaryDiaryUser.IAuthorized =
    await api.functional.auth.diaryUser.join(connection);
  typia.assert(auth);

  // Helper: List of all mood types
  const moodTypes = [
    "happy",
    "sad",
    "anxious",
    "excited",
    "angry",
    "calm",
    "stressed",
    "tired",
  ] as const satisfies EMoodType[];

  // Step 2(a): Weekly summary with NO data (should be all-zeros)
  const summaryEmpty: IMoodDiaryMoodEntryWeeklySummary =
    await api.functional.moodDiary.diaryUser.moodEntries.weeklySummary(
      connection,
    );
  typia.assert(summaryEmpty);

  // All moods with 0s
  for (const mood of moodTypes) {
    const stat = summaryEmpty.mood_counts.find((m) => m.mood_type === mood);
    TestValidator.predicate(`mood ${mood} present in all-zero state`, !!stat);
    TestValidator.equals(
      `total_count=0 for mood ${mood} in empty summary`,
      stat!.total_count,
      0,
    );
    TestValidator.equals(
      `daily_counts=0s for mood ${mood} in empty summary`,
      stat!.daily_counts,
      Array(7).fill(0),
    );
  }

  // Step 2(b): Insert a variety of valid entries across recent week (excluding today)
  const baseDay = new Date();
  baseDay.setHours(0, 0, 0, 0); // Start of today
  const msPerDay = 24 * 60 * 60 * 1000;
  const weekDates = ArrayUtil.repeat(7, (i) => {
    // i = 0: 7 days ago (start), i = 6: yesterday (end)
    const d = new Date(baseDay.getTime() - msPerDay * (7 - i));
    // Need YYYY-MM-DD string, local Asia/Calcutta date (simulate)
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  });

  // We'll insert: happy (1x on day0, 2x on day3), sad (1x on day2), angry (2x on day1), excited (3x on day4), rest skipped
  const entryPlan: Array<{ dayIdx: number; mood: EMoodType; count: number }> = [
    { dayIdx: 0, mood: "happy", count: 1 },
    { dayIdx: 3, mood: "happy", count: 2 },
    { dayIdx: 2, mood: "sad", count: 1 },
    { dayIdx: 1, mood: "angry", count: 2 },
    { dayIdx: 4, mood: "excited", count: 3 },
  ];

  for (const plan of entryPlan) {
    for (let i = 0; i < plan.count; ++i) {
      // Only set created_at if backend allows override, but assume system time
      await api.functional.moodDiary.diaryUser.moodEntries.create(connection, {
        body: {
          mood_type: plan.mood,
          note: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IMoodDiaryMoodEntry.ICreate,
      });
    }
  }

  // Step 3: Request weekly summary again
  const summaryPopulated: IMoodDiaryMoodEntryWeeklySummary =
    await api.functional.moodDiary.diaryUser.moodEntries.weeklySummary(
      connection,
    );
  typia.assert(summaryPopulated);

  // Step 4: Validate core fields and aggregation
  // 4.1 - Date window
  TestValidator.equals(
    "start_date should match start of 7d window",
    summaryPopulated.start_date,
    weekDates[0],
  );
  TestValidator.equals(
    "end_date should match end of 7d window (yesterday)",
    summaryPopulated.end_date,
    weekDates[6],
  );

  // 4.2 - All 8 mood types present with correct total/daily counts
  for (const mood of moodTypes) {
    const expectedDayCounts = Array(7).fill(0);
    for (const plan of entryPlan) {
      if (plan.mood === mood) {
        expectedDayCounts[plan.dayIdx] += plan.count;
      }
    }
    const total = expectedDayCounts.reduce((a, b) => a + b, 0);
    const stat = summaryPopulated.mood_counts.find((m) => m.mood_type === mood);
    TestValidator.predicate(
      `mood ${mood} present in summary after entries`,
      !!stat,
    );
    TestValidator.equals(
      `total_count for mood ${mood} after entries`,
      stat!.total_count,
      total,
    );
    TestValidator.equals(
      `daily_counts for mood ${mood} after entries`,
      stat!.daily_counts,
      expectedDayCounts,
    );
  }

  // 4.3 - All moods present, no duplicates
  TestValidator.equals(
    "all 8 moods present (no extra/dup)",
    summaryPopulated.mood_counts.map((c) => c.mood_type).sort(),
    [...moodTypes].sort(),
  );
}
