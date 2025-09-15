import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IMoodDiaryMoodEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IMoodDiaryMoodEntry";
import { IPageIMoodDiaryMoodEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMoodDiaryMoodEntry";
import { DiaryuserPayload } from "../decorators/payload/DiaryuserPayload";

/**
 * Retrieve a paginated list of non-archived mood diary entries for the single
 * logical user from mood_diary_mood_entries.
 *
 * This operation fetches recent mood diary entries for the current diaryUser,
 * supporting search, filtering, sorting, and pagination. Only unarchived
 * (archived=false) entries created within the last 30 days are included. All
 * fields (`id`, `mood_type`, `note`, `created_at`, `archived`) strictly match
 * business and type requirements. Pagination and search filters are provided
 * through the request body. Returned entries include all required properties
 * per IMoodDiaryMoodEntry.
 *
 * @param props - Object containing required DiaryuserPayload and filter/query
 *   body.
 * @param props.diaryUser - Authenticated diaryUser payload (for filtering to
 *   owner only).
 * @param props.body - Search, filter, and pagination options (IRequest).
 * @returns Paginated list of recent, non-archived mood diary entries with full
 *   result and pagination info.
 * @throws {Error} If any pagination parameter is invalid (page/limit <= 0 or
 *   limit > 100).
 */
export async function patchmoodDiaryDiaryUserMoodEntries(props: {
  diaryUser: DiaryuserPayload;
  body: IMoodDiaryMoodEntry.IRequest;
}): Promise<IPageIMoodDiaryMoodEntry> {
  const now = toISOStringSafe(new Date());
  // Calculate 30-days-ago cutoff (ISO8601 string)
  const cutoffTimestamp = new Date(Date.parse(now) - 30 * 24 * 60 * 60 * 1000);
  const cutoff = toISOStringSafe(cutoffTimestamp);
  // Page/limit logic with branding. Default safely. Enforce max/min.
  let page = props.body.page;
  let limit = props.body.limit;
  if (page == null || page < 1) page = 1;
  if (limit == null || limit < 1) limit = 15;
  if (limit > 100) limit = 100;
  // Error if negative or zero
  if (page < 1 || limit < 1) throw new Error("Invalid pagination parameters");
  const skip = (Number(page) - 1) * Number(limit);
  // Compose created_at date filter
  const createdAtFilter: Record<string, string> = { gte: cutoff };
  if (props.body.from_date) {
    createdAtFilter.gte = props.body.from_date;
  }
  if (props.body.to_date) {
    createdAtFilter.lte = props.body.to_date;
  }
  // Compose Prisma where condition, only include optional fields if present
  const where = {
    mood_diary_diaryuser_id: props.diaryUser.id,
    archived: false,
    created_at: createdAtFilter,
    ...(props.body.mood_type != null && { mood_type: props.body.mood_type }),
    ...(props.body.search != null &&
      props.body.search.length > 0 && {
        note: { contains: props.body.search },
      }),
  };
  // Order by created_at: default desc, or asc if specified
  const sortDir = props.body.sort_dir === "asc" ? "asc" : "desc";
  const orderBy = [{ created_at: sortDir }];
  // Query paginated results and total count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.mood_diary_mood_entries.findMany({
      where,
      orderBy,
      skip: Number(skip),
      take: Number(limit),
    }),
    MyGlobal.prisma.mood_diary_mood_entries.count({ where }),
  ]);
  // Map DB model → API DTO, handle branding & nullables
  const data = rows.map((entry) => ({
    id: entry.id,
    mood_diary_diaryuser_id: entry.mood_diary_diaryuser_id,
    mood_type: entry.mood_type,
    note: entry.note === null ? undefined : entry.note,
    created_at: toISOStringSafe(entry.created_at),
    archived: entry.archived,
  }));
  // Calculate pagination, enforce branding with Number() so branded types are preserved
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Math.ceil(total / Number(limit)),
    },
    data,
  };
}
