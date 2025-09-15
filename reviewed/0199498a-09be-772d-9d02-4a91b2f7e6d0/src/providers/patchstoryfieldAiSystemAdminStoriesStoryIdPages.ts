import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IStoryfieldAiStoryPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiStoryPage";
import { IPageIStoryfieldAiStoryPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIStoryfieldAiStoryPage";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * List and paginate all pages of a story (storyfield_ai_story_pages) for a
 * given storyId.
 *
 * Fetches a paginated, filterable list of story pages for the specified story,
 * via storyId. Supports search by text, pagination, sorting by specified
 * fields, and optional inclusion of soft-deleted pages (showDeleted). Each
 * result contains unique page id, logical order, text, and soft deletion audit
 * field as required for UI and compliance workflows. Intended for use by system
 * administrators, who have full access to all stories.
 *
 * @param props - SystemAdmin: The authenticated system admin making the request
 *   (from SystemadminAuth decorator) storyId: The unique story id whose pages
 *   are being queried body: Pagination, search, sort, and showDeleted inclusion
 *   parameters
 * @returns Paginated list of story page summaries ({ id, page_number, text,
 *   deleted_at })
 * @throws {Error} If database query fails or parameters are invalid
 */
export async function patchstoryfieldAiSystemAdminStoriesStoryIdPages(props: {
  systemAdmin: SystemadminPayload;
  storyId: string & tags.Format<"uuid">;
  body: IStoryfieldAiStoryPage.IRequest;
}): Promise<IPageIStoryfieldAiStoryPage.ISummary> {
  const { storyId, body } = props;
  // Defensive defaulting and branding compliance
  const page = body.page ?? 1;
  const limit = body.limit ?? 15;
  const skip = (page - 1) * limit;

  // Only allow valid order by fields—api contract only allows these three options.
  let orderByField: "page_number" | "created_at" | "updated_at" = "page_number";
  if (
    body.orderBy === "created_at" ||
    body.orderBy === "updated_at" ||
    body.orderBy === "page_number"
  ) {
    orderByField = body.orderBy;
  }
  const orderDirection: "asc" | "desc" = body.order === "desc" ? "desc" : "asc";

  // Build where clause according to optionals and fulltext search
  const where = {
    storyfield_ai_story_id: storyId,
    ...(body.showDeleted ? {} : { deleted_at: null }),
    ...(body.search ? { text: { contains: body.search } } : {}),
  };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.storyfield_ai_story_pages.findMany({
      where,
      orderBy: { [orderByField]: orderDirection },
      skip,
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

  // Map the result for ISummary
  const data = rows.map((row) => ({
    id: row.id,
    page_number: row.page_number,
    text: row.text,
    deleted_at:
      row.deleted_at !== null && row.deleted_at !== undefined
        ? toISOStringSafe(row.deleted_at)
        : null,
  }));

  // Compose the pagination structure with strict numeric types
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Number(Math.ceil(total / limit)),
    },
    data,
  };
}
