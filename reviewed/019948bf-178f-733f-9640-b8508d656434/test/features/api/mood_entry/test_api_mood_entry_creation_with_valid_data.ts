import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { EMoodType } from "@ORGANIZATION/PROJECT-api/lib/structures/EMoodType";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IMoodDiaryDiaryUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IMoodDiaryDiaryUser";
import type { IMoodDiaryMoodEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IMoodDiaryMoodEntry";

/**
 * Validate creation of a new mood diary entry for the (only) diary user.
 *
 * This test:
 *
 * 1. Authenticates/logs in as the logical diaryUser via join endpoint
 * 2. Submits a valid mood entry (allowed mood_type; note ≤500 chars or omitted)
 * 3. Validates the entry is created with the expected server-generated fields
 * 4. Confirms all business constraints: mood_type allowed; note length ≤500;
 *    archived is false; user id binding; etc.
 * 5. Attempts up to 3 creations within a single day (Asia/Calcutta), and verifies
 *    all succeed
 */
export async function test_api_mood_entry_creation_with_valid_data(
  connection: api.IConnection,
) {
  // 1. Join/log in as diaryUser
  const auth: IMoodDiaryDiaryUser.IAuthorized =
    await api.functional.auth.diaryUser.join(connection);
  typia.assert(auth);

  // All 8 allowed mood types
  const allowedMoods = [
    "happy",
    "sad",
    "anxious",
    "excited",
    "angry",
    "calm",
    "stressed",
    "tired",
  ] as const;

  // 2. Create up to three entries using all different valid mood values and optional notes
  const createdEntries: IMoodDiaryMoodEntry[] = [];
  for (const idx of [0, 1, 2]) {
    const mood_type = RandomGenerator.pick(allowedMoods);
    // Randomly decide if note is present, null, or omitted
    let note: string | null | undefined;
    switch (RandomGenerator.pick([0, 1, 2])) {
      case 0:
        note = undefined;
        break;
      case 1:
        note = null;
        break;
      case 2:
        // Generate a random note ≤ 500 chars
        note = RandomGenerator.paragraph({
          sentences: RandomGenerator.pick([5, 10, 15]),
          wordMin: 4,
          wordMax: 12,
        }).slice(0, 500);
        break;
    }
    const createBody = {
      mood_type,
      ...(note !== undefined ? { note } : {}),
    } satisfies IMoodDiaryMoodEntry.ICreate;
    const entry = await api.functional.moodDiary.diaryUser.moodEntries.create(
      connection,
      { body: createBody },
    );
    typia.assert(entry);
    TestValidator.equals(
      "user id matches",
      entry.mood_diary_diaryuser_id,
      auth.id,
    );
    TestValidator.equals("mood_type matches", entry.mood_type, mood_type);
    TestValidator.equals("archived must be false", entry.archived, false);
    if (note === undefined || note === null) {
      TestValidator.equals(
        "note matches missing or null",
        entry.note,
        note ?? null,
      );
    } else {
      TestValidator.equals("note matches non-null", entry.note, note);
      TestValidator.predicate("note length ≤ 500", note.length <= 500);
    }
    TestValidator.predicate(
      "created_at is ISO8601",
      typeof entry.created_at === "string" &&
        /^\d{4}-\d{2}-\d{2}T[0-9:.]+(Z|([+\-][0-9:]+))$/.test(entry.created_at),
    );
    createdEntries.push(entry);
  }

  // 3 entries must have unique IDs and valid payloads
  const ids = createdEntries.map((e) => e.id);
  TestValidator.predicate(
    "all entries have unique ids",
    ids.length === new Set(ids).size,
  );
}
