import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficePageComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePageComment";
import { IPageIFlexOfficePageComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficePageComment";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve a filtered and paginated list of comments for a specific page.
 *
 * Allows an authenticated admin to retrieve comments associated with the
 * specified FlexOffice UI page. Supports filtering by editor, content search,
 * and pagination.
 *
 * @param props - Properties required for the operation
 * @param props.admin - Authenticated admin user performing the operation
 * @param props.pageId - UUID of the FlexOffice UI page to retrieve comments for
 * @param props.body - Filter, pagination and search parameters
 * @returns Paginated comment summaries matching the filters
 * @throws {Error} Throws when access is unauthorized or if the pageId is
 *   invalid
 */
export async function patchflexOfficeAdminPagesPageIdPageComments(props: {
  admin: AdminPayload;
  pageId: string & tags.Format<"uuid">;
  body: IFlexOfficePageComment.IRequest;
}): Promise<IPageIFlexOfficePageComment.ISummary> {
  const { admin, pageId, body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  const where = {
    page_id: pageId,
    deleted_at: null,
    ...(body.editor_id !== undefined &&
      body.editor_id !== null && {
        editor_id: body.editor_id,
      }),
    ...(body.search !== undefined &&
      body.search !== null && {
        content: {
          contains: body.search,
        },
      }),
  };

  const [results, total] = await Promise.all([
    MyGlobal.prisma.flex_office_page_comments.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        content: true,
        created_at: true,
        editor_id: true,
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
    data: results.map((comment) => ({
      id: comment.id,
      content: comment.content,
      editor_id: comment.editor_id,
      created_at: toISOStringSafe(comment.created_at),
    })),
  };
}
