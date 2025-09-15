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
 * Retrieves a filtered and paginated list of FlexOffice page comments for a
 * viewer.
 *
 * This endpoint supports filtering by page ID, editor ID, and content search
 * term. It excludes soft-deleted comments (where deleted_at is not null).
 * Pagination defaults to page 1 and limit 20 if not specified.
 *
 * @param props - Properties including the authenticated viewer and
 *   search/filter criteria.
 * @param props.viewer - Authenticated viewer user payload.
 * @param props.body - Filter and pagination request body.
 * @returns Paginated summary of page comment data matching the filters.
 * @throws {Error} When the database query fails or inputs are invalid.
 */
export async function patchflexOfficeViewerPageComments(props: {
  viewer: ViewerPayload;
  body: IFlexOfficePageComment.IRequest;
}): Promise<IPageIFlexOfficePageComment.ISummary> {
  const { viewer, body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 20) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const skip = (page - 1) * limit;

  const where: Prisma.flex_office_page_commentsWhereInput = {
    deleted_at: null,
    ...(body.page_id !== undefined &&
      body.page_id !== null && { page_id: body.page_id }),
    ...(body.editor_id !== undefined &&
      body.editor_id !== null && { editor_id: body.editor_id }),
    ...(body.search !== undefined &&
      body.search !== null && { content: { contains: body.search } }),
  };

  const [comments, total] = await Promise.all([
    MyGlobal.prisma.flex_office_page_comments.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        content: true,
        editor_id: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.flex_office_page_comments.count({ where }),
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
      editor_id: comment.editor_id,
      created_at: toISOStringSafe(comment.created_at),
    })),
  };
}
