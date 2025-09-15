import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IStoryfieldAiTtsResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiTtsResult";
import { IPageIStoryfieldAiTtsResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIStoryfieldAiTtsResult";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * List and search TTS results for a story (filter/sort/paginate).
 *
 * Retrieves a filtered, paginated list of Text-to-Speech (TTS) audio results
 * for a specific story. The client can search, filter, or sort TTS results
 * (such as by dialect, page, or date) using advanced options in the request
 * body. Operates on the storyfield_ai_tts_results table, supporting usage
 * reporting, QA, and story accessibility enhancement.
 *
 * Only the owner of the story or a system administrator is authorized to access
 * all TTS results for a given story. This implementation is for system
 * administrator access.
 *
 * @param props -
 *
 *   - SystemAdmin: Authenticated SystemadminPayload (system admin role)
 *   - StoryId: Unique story identifier (UUID)
 *   - Body: IStoryfieldAiTtsResult.IRequest (filters, pagination, and sort)
 *
 * @returns Paginated list of TTS Result Summaries
 *   (IPageIStoryfieldAiTtsResult.ISummary)
 * @throws {Error} If pagination/sorting constraints are violated
 */
export async function patchstoryfieldAiSystemAdminStoriesStoryIdTtsResults(props: {
  systemAdmin: SystemadminPayload;
  storyId: string & tags.Format<"uuid">;
  body: IStoryfieldAiTtsResult.IRequest;
}): Promise<IPageIStoryfieldAiTtsResult.ISummary> {
  const { storyId, body } = props;

  // Determine page and limit (default page=1, limit=20, clamp limit: max 100)
  const page = typeof body.page === "number" && body.page > 0 ? body.page : 1;
  const limit =
    typeof body.limit === "number" && body.limit > 0
      ? body.limit > 100
        ? 100
        : body.limit
      : 20;
  const skip = (page - 1) * limit;

  // Allowed sorting fields
  const allowedSortFields = ["created_at", "dialect"];
  const sortRaw = body.sort ?? "created_at";
  const sortField = allowedSortFields.includes(sortRaw)
    ? sortRaw
    : "created_at";
  const sortDirection = body.direction === "asc" ? "asc" : "desc";

  // Inline 'where' according to business and DTO rules
  const where = {
    storyfield_ai_story_id: storyId,
    deleted_at: null,
    ...(body.dialect !== undefined &&
      body.dialect !== null && {
        dialect: body.dialect,
      }),
    ...(body.storyfield_ai_story_page_id !== undefined &&
      body.storyfield_ai_story_page_id !== null && {
        storyfield_ai_story_page_id: body.storyfield_ai_story_page_id,
      }),
    ...(body.search !== undefined &&
      body.search !== null && {
        source_text: { contains: body.search },
      }),
  };

  // Query paginated records and count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.storyfield_ai_tts_results.findMany({
      where,
      orderBy: { [sortField]: sortDirection },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.storyfield_ai_tts_results.count({ where }),
  ]);

  // Properly type and convert return results (no use of 'as', use explicit conversion per field)
  const data = rows.map(
    (row): IStoryfieldAiTtsResult.ISummary => ({
      id: row.id,
      tts_audio_uri: row.tts_audio_uri,
      dialect: row.dialect,
      source_text: row.source_text,
      deleted_at:
        row.deleted_at !== null && row.deleted_at !== undefined
          ? toISOStringSafe(row.deleted_at)
          : null,
    }),
  );

  // Construct pagination with proper branding for IPagination
  const pagination = {
    current: Number(page),
    limit: Number(limit),
    records: Number(total),
    pages: Number(Math.ceil(total / limit)),
  };

  return {
    pagination,
    data,
  };
}
