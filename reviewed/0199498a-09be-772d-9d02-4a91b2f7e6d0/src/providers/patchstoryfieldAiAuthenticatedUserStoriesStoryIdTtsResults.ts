import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IStoryfieldAiTtsResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiTtsResult";
import { IPageIStoryfieldAiTtsResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIStoryfieldAiTtsResult";
import { AuthenticateduserPayload } from "../decorators/payload/AuthenticateduserPayload";

/**
 * List and search TTS results for a story (filter/sort/paginate).
 *
 * Retrieves a paginated and filtered list of Text-to-Speech (TTS) audio results
 * for a specific story owned by the authenticated user. Supports advanced
 * filtering (by dialect, story page, or text search), sorting, and pagination.
 * The operation only permits access to stories owned by the current user and
 * not soft-deleted.
 *
 * @param props - AuthenticatedUser: The authenticated user payload (owner of
 *   the story) storyId: The UUID of the story for which TTS results are being
 *   listed body: Filtering, sorting, and pagination options for the TTS results
 *   search
 * @returns Paginated list of TTS result summary objects matching search/filter
 * @throws {Error} If the story does not exist or does not belong to the
 *   authenticated user
 */
export async function patchstoryfieldAiAuthenticatedUserStoriesStoryIdTtsResults(props: {
  authenticatedUser: AuthenticateduserPayload;
  storyId: string & tags.Format<"uuid">;
  body: IStoryfieldAiTtsResult.IRequest;
}): Promise<IPageIStoryfieldAiTtsResult.ISummary> {
  // --- Authorization and ownership check ---
  const story = await MyGlobal.prisma.storyfield_ai_stories.findFirst({
    where: {
      id: props.storyId,
      storyfield_ai_authenticateduser_id: props.authenticatedUser.id,
      deleted_at: null,
    },
  });
  if (!story) {
    throw new Error("Story does not exist or you do not have access.");
  }

  // --- Extract and normalize pagination/sort params ---
  const {
    dialect,
    storyfield_ai_story_page_id,
    search,
    sort,
    direction,
    page,
    limit,
  } = props.body;
  const actualPage = typeof page === "number" && page > 0 ? page : 1;
  const actualLimit = typeof limit === "number" && limit > 0 ? limit : 20;
  const skip = (actualPage - 1) * actualLimit;

  // --- Sorting ---
  const allowedSortFields = ["created_at", "dialect", "tts_audio_uri"] as const;
  const sortField = allowedSortFields.includes(
    (sort ?? "") as (typeof allowedSortFields)[number],
  )
    ? sort!
    : "created_at";
  const sortOrder = direction === "asc" ? "asc" : "desc";

  // --- Build where clause for query ---
  const where = {
    storyfield_ai_story_id: props.storyId,
    deleted_at: null,
    ...(dialect !== undefined && dialect !== null && { dialect }),
    ...(storyfield_ai_story_page_id !== undefined &&
      storyfield_ai_story_page_id !== null && { storyfield_ai_story_page_id }),
    ...(search !== undefined &&
      search !== null &&
      search.trim() !== "" && {
        source_text: { contains: search },
      }),
  };

  // --- Query and count (in parallel) ---
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.storyfield_ai_tts_results.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip,
      take: actualLimit,
      select: {
        id: true,
        tts_audio_uri: true,
        dialect: true,
        source_text: true,
        deleted_at: true,
      },
    }),
    MyGlobal.prisma.storyfield_ai_tts_results.count({ where }),
  ]);

  // --- Map DB rows to ISummary DTO (convert deleted_at to branded type if present) ---
  const data = rows.map((row) => ({
    id: row.id,
    tts_audio_uri: row.tts_audio_uri,
    dialect: row.dialect,
    source_text: row.source_text,
    deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : undefined,
  }));

  // --- Build and return paginated result ---
  return {
    pagination: {
      current: Number(actualPage),
      limit: Number(actualLimit),
      records: Number(total),
      pages: Number(Math.ceil(total / actualLimit)),
    },
    data,
  };
}
