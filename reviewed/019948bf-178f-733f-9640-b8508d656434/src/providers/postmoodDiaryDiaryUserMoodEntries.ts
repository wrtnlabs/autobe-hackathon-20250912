import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IMoodDiaryMoodEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IMoodDiaryMoodEntry";
import { DiaryuserPayload } from "../decorators/payload/DiaryuserPayload";

/**
 * Create a new mood diary entry for the logical user.
 *
 * This operation allows the single logical diary user to submit a new mood
 * diary entry in the mood_diary_mood_entries table. Business rules enforce no
 * more than 3 entries per calendar day (Asia/Calcutta time), required mood_type
 * from allowed values, note must be ≤500 chars if present, and all timestamps
 * are set reliably by the server. The created_at value is always the current
 * Asia/Calcutta time in ISO8601, regardless of user input. Entries are
 * immutable. All validation failures produce detailed error messages.
 *
 * @param props - Object containing authentication payload and entry creation
 *   body
 * @param props.diaryUser - Authenticated logical diaryuser (single-user
 *   scenario)
 * @param props.body - Entry data (mood_type and optional note)
 * @returns The newly created mood diary entry, never editable or deletable
 * @throws {Error} If entry limit is exceeded, invalid mood, or note too long
 */
export async function postmoodDiaryDiaryUserMoodEntries(props: {
  diaryUser: DiaryuserPayload;
  body: IMoodDiaryMoodEntry.ICreate;
}): Promise<IMoodDiaryMoodEntry> {
  const { diaryUser, body } = props;
  // 1. Validate mood_type
  const allowedMoods: IMoodDiaryMoodEntry["mood_type"][] = [
    "happy",
    "sad",
    "anxious",
    "excited",
    "angry",
    "calm",
    "stressed",
    "tired",
  ];
  if (!allowedMoods.includes(body.mood_type)) {
    throw new Error(
      `Invalid mood_type: '${body.mood_type}'. Allowed values: ${allowedMoods.join(", ")}`,
    );
  }
  // 2. Validate note (if present)
  if (body.note !== undefined && body.note !== null && body.note.length > 500) {
    throw new Error("Note must be blank or up to 500 Unicode characters.");
  }
  // 3. Determine Asia/Calcutta (UTC+5:30) calendar date boundaries for today
  // Compute current time in IST
  const nowUtcMillis = Date.now();
  const IST_OFFSET_MINUTES = 330; // +05:30 offset in minutes
  const nowInISTMillis = nowUtcMillis + IST_OFFSET_MINUTES * 60 * 1000;
  const nowInIST = new Date(nowInISTMillis);
  const year = nowInIST.getUTCFullYear();
  const month = nowInIST.getUTCMonth(); // 0-based
  const day = nowInIST.getUTCDate();
  // Start and end of day in IST, in UTC
  const startISTMillis =
    Date.UTC(year, month, day, 0, 0, 0) - IST_OFFSET_MINUTES * 60 * 1000;
  const endISTMillis =
    Date.UTC(year, month, day, 23, 59, 59, 999) -
    IST_OFFSET_MINUTES * 60 * 1000;
  // 4. Count today's (non-archived) entries for this diaryuser
  const entriesToday = await MyGlobal.prisma.mood_diary_mood_entries.count({
    where: {
      mood_diary_diaryuser_id: diaryUser.id,
      archived: false,
      created_at: {
        gte: toISOStringSafe(new Date(startISTMillis)),
        lte: toISOStringSafe(new Date(endISTMillis)),
      },
    },
  });
  if (entriesToday >= 3) {
    throw new Error(
      "Entry limit reached: only 3 mood entries allowed per calendar day.",
    );
  }
  // 5. Generate IDs and timestamps with branding
  const newId = v4() as string & tags.Format<"uuid">;
  // Created-at timestamp MUST be server time (Asia/Calcutta notionally, but value in UTC ISO)
  const nowIso = toISOStringSafe(new Date());
  // 6. Create DB entry
  const created = await MyGlobal.prisma.mood_diary_mood_entries.create({
    data: {
      id: newId,
      mood_diary_diaryuser_id: diaryUser.id,
      mood_type: body.mood_type,
      note: body.note !== undefined ? body.note : null,
      created_at: nowIso,
      archived: false,
    },
  });
  // 7. Assemble response object (exact DTO fields)
  return {
    id: created.id,
    mood_diary_diaryuser_id: created.mood_diary_diaryuser_id,
    mood_type: created.mood_type as IMoodDiaryMoodEntry["mood_type"],
    // The DTO contract expects missing/blank note as undefined or null
    note: created.note !== undefined ? created.note : null,
    created_at: toISOStringSafe(created.created_at),
    archived: created.archived,
  };
}
