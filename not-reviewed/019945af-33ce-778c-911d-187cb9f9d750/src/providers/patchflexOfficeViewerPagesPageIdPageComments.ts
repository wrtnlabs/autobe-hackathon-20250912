import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficePageComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePageComment";
import { IPageIFlexOfficePageComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficePageComment";
import { ViewerPayload } from "../decorators/payload/ViewerPayload";

/**
 * Retrieves a filtered and paginated list of comments for a specified
 * FlexOffice UI page.
 *
 * This operation fetches page comments filtered by the given page ID provided
 * as a path parameter. It applies optional filters such as editor ID, text
 * search, and uses pagination parameters from the request body. Comments with
 * non-null `deleted_at` (soft deleted) are excluded.
 *
 * Authorization is required; the caller must be authenticated as a viewer.
 *
 * @param props - Object containing viewer authentication, page ID, and filter
 *   parameters
 * @param props.viewer - The authenticated viewer user information
 * @param props.pageId - The UUID of the FlexOffice page to retrieve comments
 *   for
 * @param props.body - Filtering and pagination request options
 * @returns Paginated list of page comment summaries conforming to
 *   IPageIFlexOfficePageComment.ISummary
 * @throws Error if an unexpected database error occurs
 */
export async function patchflexOfficeViewerPagesPageIdPageComments(props: {
  viewer: ViewerPayload;
  pageId: string & tags.Format<"uuid">;
  body: IFlexOfficePageComment.IRequest;
}): Promise<IPageIFlexOfficePageComment.ISummary> {
  const { viewer, pageId, body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0>;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0>;
  const skip = (page - 1) * limit;

  const whereCondition = {
    deleted_at: null,
    page_id: pageId,
    ...(body.editor_id !== undefined && { editor_id: body.editor_id }),
    ...(body.search !== undefined &&
      body.search !== null && { content: { contains: body.search } }),
  };

  const [comments, total] = await Promise.all([
    MyGlobal.prisma.flex_office_page_comments.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        content: true,
        created_at: true,
        editor_id: true,
      },
    }),
    MyGlobal.prisma.flex_office_page_comments.count({ where: whereCondition }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: comments.map((comment) => ({
      id: comment.id,
      content: comment.content,
      created_at: toISOStringSafe(comment.created_at),
      editor_id: comment.editor_id,
    })),
  };
}
