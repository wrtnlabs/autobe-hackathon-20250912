import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { EMoodType } from "@ORGANIZATION/PROJECT-api/lib/structures/EMoodType";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IMoodDiaryDiaryUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IMoodDiaryDiaryUser";
import type { IMoodDiaryMoodEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IMoodDiaryMoodEntry";

/**
 * E2E test for retrieving mood diary entry details by id as a diaryUser.
 *
 * 1. Establish session for diaryUser (POST /auth/diaryUser/join).
 * 2. Create a valid mood diary entry as diaryUser (choose mood_type from enum,
 *    supply/omit note randomly).
 * 3. Retrieve the entry details using GET
 *    /moodDiary/diaryUser/moodEntries/{entryId}.
 *
 *    - Check fields: id, mood_type (enum), note (optional), created_at
 *         (ISO8601), archived (false)
 *    - Assert that data matches what was submitted in creation
 * 4. Negative test: Try to retrieve with a random invalid UUID (should error)
 * 5. Negative test: Simulate an archived entry by creating an old entry
 *    (created_at > 30 days ago), check retrieval errors.
 *
 *    - If archive cannot be simulated directly, explain logic / skip in review.
 */
export async function test_api_mood_entry_detail_retrieval_by_id(
  connection: api.IConnection,
) {
  // 1. Join as diaryUser, get session/token
  const auth = await api.functional.auth.diaryUser.join(connection);
  typia.assert(auth);

  // 2. Create mood entry (random allowed mood_type, sometimes with note)
  const moodTypes = [
    "happy",
    "sad",
    "anxious",
    "excited",
    "angry",
    "calm",
    "stressed",
    "tired",
  ] as const;
  const mood_type = RandomGenerator.pick(moodTypes);
  const note =
    Math.random() > 0.5
      ? RandomGenerator.paragraph({ sentences: 2 })
      : undefined;
  const entryCreateBody = {
    mood_type,
    note,
  } satisfies IMoodDiaryMoodEntry.ICreate;
  const created = await api.functional.moodDiary.diaryUser.moodEntries.create(
    connection,
    {
      body: entryCreateBody,
    },
  );
  typia.assert(created);

  // 3. Retrieve entry by id
  const fetched = await api.functional.moodDiary.diaryUser.moodEntries.at(
    connection,
    {
      entryId: created.id,
    },
  );
  typia.assert(fetched);
  TestValidator.equals("mood entry id matches", fetched.id, created.id);
  TestValidator.equals(
    "mood_type matches",
    fetched.mood_type,
    created.mood_type,
  );
  TestValidator.equals("note matches", fetched.note, created.note ?? null);
  TestValidator.equals(
    "created_at matches",
    fetched.created_at,
    created.created_at,
  );
  TestValidator.equals("archived must be false", fetched.archived, false);

  // 4. Negative - fetch with invalid/random uuid
  await TestValidator.error("fetching with invalid id fails", async () => {
    await api.functional.moodDiary.diaryUser.moodEntries.at(connection, {
      entryId: typia.random<string & tags.Format<"uuid">>(),
    });
  });

  // 5. Negative - archived entry retrieval (simulate if possible)
  // Business logic: entries older than 30 days are auto-archived and rejected for GET.
  // Since created_at is generated server-side and cannot be set in test, cannot directly create an archived entry.
  // So, this branch is not implementable via API (left for documentation, no code).
}
