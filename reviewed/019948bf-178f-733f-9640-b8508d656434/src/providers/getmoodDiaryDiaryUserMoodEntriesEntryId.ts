import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IMoodDiaryMoodEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IMoodDiaryMoodEntry";
import { DiaryuserPayload } from "../decorators/payload/DiaryuserPayload";

/**
 * Fetch details for a single non-archived mood diary entry by id from
 * mood_diary_mood_entries.
 *
 * This operation retrieves the details for a specific, non-archived mood diary
 * entry using its unique id. Only unarchived entries (archived=false, created
 * within 30 days) are retrievable; attempts to fetch archived or non-existent
 * entries result in a not-found error. Returned data includes unique id,
 * mood_type (one of 8 allowed), optional note, UTC timestamp of creation, and
 * archived flag (guaranteed false for successful lookups).
 *
 * This operation does not permit any editing or deletion: returned entries are
 * immutable, and archiving is enforced by business rule (entries over 30 days
 * old).
 *
 * @param props - Object containing the logical diary user authentication
 *   payload and the entryId to fetch
 * @param props.diaryUser - The authenticated DiaryuserPayload for API role
 *   compliance (business logic: single user, context only)
 * @param props.entryId - UUID of the target mood entry to retrieve (must be
 *   valid and for an unarchived entry)
 * @returns The complete mood diary entry detail as IMoodDiaryMoodEntry (all
 *   fields required; note optional/nullable)
 * @throws {Error} If entry does not exist or has been archived (access denied
 *   or not found scenario)
 */
export async function getmoodDiaryDiaryUserMoodEntriesEntryId(props: {
  diaryUser: DiaryuserPayload;
  entryId: string & tags.Format<"uuid">;
}): Promise<IMoodDiaryMoodEntry> {
  const { diaryUser, entryId } = props;
  const entry = await MyGlobal.prisma.mood_diary_mood_entries.findFirst({
    where: {
      id: entryId,
      archived: false,
    },
    select: {
      id: true,
      mood_diary_diaryuser_id: true,
      mood_type: true,
      note: true,
      created_at: true,
      archived: true,
    },
  });
  if (!entry) {
    throw new Error("Mood diary entry not found or has been archived.");
  }
  return {
    id: entry.id,
    mood_diary_diaryuser_id: entry.mood_diary_diaryuser_id,
    mood_type: entry.mood_type,
    note: entry.note === null ? undefined : entry.note,
    created_at: toISOStringSafe(entry.created_at),
    archived: entry.archived,
  };
}
