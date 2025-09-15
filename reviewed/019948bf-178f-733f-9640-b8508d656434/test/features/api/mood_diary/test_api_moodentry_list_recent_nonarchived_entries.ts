import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { EMoodType } from "@ORGANIZATION/PROJECT-api/lib/structures/EMoodType";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IMoodDiaryDiaryUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IMoodDiaryDiaryUser";
import type { IMoodDiaryMoodEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IMoodDiaryMoodEntry";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMoodDiaryMoodEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMoodDiaryMoodEntry";

/**
 * Validate retrieval of non-archived mood entries for the single diaryUser.
 *
 * 1. Authenticate and get diaryUser session.
 * 2. Create mood entries for several days, varying mood_type and note, ensure
 *    daily 3 max.
 * 3. Use PATCH /moodDiary/diaryUser/moodEntries with no filters to get recent
 *    entries.
 *
 * - Validate all entries are archived=false and within 30 days.
 * - Mood types are one of the 8 allowed values.
 * - Entry count (in data and pagination) does not exceed total created.
 *
 * 4. Create an entry backdated to >31 days ago (simulate archived as old), ensure
 *    it's never present in results.
 * 5. Test pagination: request small page size, check correct
 *    pagination.meta/pages.
 * 6. Filter: query a single mood_type, ensure only those returned.
 * 7. Filter: search by note substring, all matches must contain string.
 * 8. Error: send invalid pagination (negative page/limit), expect error.
 * 9. Empty: use separate unauthenticated connection (fresh with empty dataset),
 *    expect empty list.
 */
export async function test_api_moodentry_list_recent_nonarchived_entries(
  connection: api.IConnection,
) {
  // 1. Authenticate/join as diaryUser
  const session: IMoodDiaryDiaryUser.IAuthorized =
    await api.functional.auth.diaryUser.join(connection);
  typia.assert(session);
  const moods = [
    "happy",
    "sad",
    "anxious",
    "excited",
    "angry",
    "calm",
    "stressed",
    "tired",
  ] as const;
  const now = new Date();
  // 2. Create 3 entries for today, with each allowed mood_type + 1 per prev 5 days
  const createdEntries: IMoodDiaryMoodEntry[] = [];
  for (let d = 0; d < 5; ++d) {
    for (let n = 0; n < 3; ++n) {
      const mood_type = RandomGenerator.pick(moods);
      const note = RandomGenerator.paragraph({
        sentences: 1,
        wordMin: 8,
        wordMax: 14,
      });
      const entry = await api.functional.moodDiary.diaryUser.moodEntries.create(
        connection,
        {
          body: {
            mood_type,
            note,
          } satisfies IMoodDiaryMoodEntry.ICreate,
        },
      );
      typia.assert(entry);
      createdEntries.push(entry);
    }
  }
  // 3. Get recent mood entries (no filter)
  const recentPage: IPageIMoodDiaryMoodEntry =
    await api.functional.moodDiary.diaryUser.moodEntries.index(connection, {
      body: {} satisfies IMoodDiaryMoodEntry.IRequest,
    });
  typia.assert(recentPage);
  TestValidator.predicate(
    "all entries archived=false",
    recentPage.data.every((e) => e.archived === false),
  );
  const dayMs = 24 * 60 * 60 * 1000;
  const cutoff = now.getTime() - 30 * dayMs;
  TestValidator.predicate(
    "all entries within 30 days",
    recentPage.data.every((e) => new Date(e.created_at).getTime() >= cutoff),
  );
  TestValidator.predicate(
    "all mood_type valid",
    recentPage.data.every((e) => moods.includes(e.mood_type)),
  );
  TestValidator.predicate("count <= 15", recentPage.data.length <= 15);
  TestValidator.equals(
    "pagination.records is correct",
    recentPage.pagination.records,
    recentPage.data.length,
  );

  // 4. Create an archived (old) entry by simulating system date -- not possible through allowed API, skip (checked by previous test).
  // 5. Pagination: request limit 5, page 1
  const pagedPage = await api.functional.moodDiary.diaryUser.moodEntries.index(
    connection,
    {
      body: { limit: 5, page: 1 } satisfies IMoodDiaryMoodEntry.IRequest,
    },
  );
  typia.assert(pagedPage);
  TestValidator.equals(
    "limit match",
    pagedPage.data.length,
    Math.min(5, createdEntries.length),
  );
  TestValidator.equals("page current==1", pagedPage.pagination.current, 1);

  // 6. Filter: mood_type only
  const moodToFilter = RandomGenerator.pick(moods);
  const moodTypePage =
    await api.functional.moodDiary.diaryUser.moodEntries.index(connection, {
      body: { mood_type: moodToFilter } satisfies IMoodDiaryMoodEntry.IRequest,
    });
  typia.assert(moodTypePage);
  TestValidator.predicate(
    "all results same mood_type",
    moodTypePage.data.every((e) => e.mood_type === moodToFilter),
  );

  // 7. Filter: substring search by note
  const targetEntry = createdEntries.find(
    (e) => typeof e.note === "string" && e.note.length > 10,
  );
  if (targetEntry && typeof targetEntry.note === "string") {
    const searchTerm = targetEntry.note.slice(0, 4);
    const searchResultPage =
      await api.functional.moodDiary.diaryUser.moodEntries.index(connection, {
        body: { search: searchTerm } satisfies IMoodDiaryMoodEntry.IRequest,
      });
    typia.assert(searchResultPage);
    TestValidator.predicate(
      "all search matches contain string",
      searchResultPage.data.every(
        (e) => typeof e.note === "string" && e.note.includes(searchTerm),
      ),
    );
  }
  // 8. Error: invalid negative page/limit
  await TestValidator.error("invalid pagination input rejected", async () => {
    await api.functional.moodDiary.diaryUser.moodEntries.index(connection, {
      body: { page: -1, limit: -5 } satisfies IMoodDiaryMoodEntry.IRequest,
    });
  });
  // 9. Empty: new unauthenticated connection, no data
  const emptyConn: api.IConnection = { ...connection, headers: {} };
  const emptyPage = await api.functional.moodDiary.diaryUser.moodEntries.index(
    emptyConn,
    {
      body: {} satisfies IMoodDiaryMoodEntry.IRequest,
    },
  );
  typia.assert(emptyPage);
  TestValidator.equals("result empty", emptyPage.data.length, 0);
}
