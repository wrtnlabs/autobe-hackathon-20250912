import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IStoryfieldAiStoryPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiStoryPage";
import { IPageIStoryfieldAiStoryPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIStoryfieldAiStoryPage";
import { AuthenticateduserPayload } from "../decorators/payload/AuthenticateduserPayload";

/**
 * List and paginate all pages of a story (storyfield_ai_story_pages) for a
 * given storyId.
 *
 * Fetch a filtered and paginated list of pages for a particular AI-generated
 * fairy tale. This endpoint is intended for use by authenticated users seeking
 * to view their own story's content, or by system administrators reviewing any
 * story. It supports advanced pagination, search, and sorting for navigating
 * long stories efficiently.
 *
 * Access controls are enforced so users can only access the pages of stories
 * they own, while administrators have system-wide access. Each result includes
 * page number, generated text, and soft-deletion audit metadata, with support
 * for soft-deleted record filtering if required by compliance workflows.
 *
 * @param props - Endpoint parameters and request body
 * @param props.authenticatedUser - The authenticated user making the request
 *   (ownership checked)
 * @param props.storyId - Unique identifier for the parent story whose pages are
 *   to be listed
 * @param props.body - Filtering, search, and pagination parameters
 * @returns Paginated list of story page summaries (id, page_number, text,
 *   deleted_at)
 * @throws {Error} If story is not found or not owned by this user
 */
export async function patchstoryfieldAiAuthenticatedUserStoriesStoryIdPages(props: {
  authenticatedUser: AuthenticateduserPayload;
  storyId: string & tags.Format<"uuid">;
  body: IStoryfieldAiStoryPage.IRequest;
}): Promise<IPageIStoryfieldAiStoryPage.ISummary> {
  const { authenticatedUser, storyId, body } = props;

  // 1. Verify story ownership
  const story = await MyGlobal.prisma.storyfield_ai_stories.findFirst({
    where: {
      id: storyId,
      storyfield_ai_authenticateduser_id: authenticatedUser.id,
    },
  });
  if (!story) {
    throw new Error("Story not found or you do not have access");
  }

  // 2. Pagination and defaulting
  const page = body.page ?? 1;
  const limit = body.limit ?? 15;

  // 3. Prepare filter criteria
  const where = {
    storyfield_ai_story_id: storyId,
    ...(body.showDeleted ? {} : { deleted_at: null }),
    ...(body.search !== undefined && body.search !== null && body.search !== ""
      ? { text: { contains: body.search } }
      : {}),
  };

  // 4. Sorting
  const allowedOrderBy = ["page_number", "created_at", "updated_at"];
  const allowedOrder = ["asc", "desc"];
  const orderByField =
    body.orderBy && allowedOrderBy.includes(body.orderBy)
      ? body.orderBy
      : "page_number";
  const orderDirection =
    body.order && allowedOrder.includes(body.order) ? body.order : "asc";

  // 5. Query for rows and total count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.storyfield_ai_story_pages.findMany({
      where,
      orderBy: { [orderByField]: orderDirection },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        page_number: true,
        text: true,
        deleted_at: true,
      },
    }),
    MyGlobal.prisma.storyfield_ai_story_pages.count({ where }),
  ]);

  // 6. Map results to ISummary
  const data = rows.map((row) => {
    let deleted_at: (string & tags.Format<"date-time">) | null | undefined =
      undefined;
    if (row.deleted_at !== null && row.deleted_at !== undefined) {
      deleted_at = toISOStringSafe(row.deleted_at);
    } else if (row.deleted_at === null) {
      deleted_at = null;
    }
    return {
      id: row.id,
      page_number: row.page_number,
      text: row.text,
      ...(deleted_at !== undefined ? { deleted_at } : {}),
    };
  });

  // 7. Pagination object (strip typia tags)
  const result: IPageIStoryfieldAiStoryPage.ISummary = {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data,
  };
  return result;
}
