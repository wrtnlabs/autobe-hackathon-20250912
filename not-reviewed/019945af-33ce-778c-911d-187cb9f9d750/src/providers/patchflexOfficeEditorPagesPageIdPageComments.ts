import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficePageComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePageComment";
import { IPageIFlexOfficePageComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficePageComment";
import { EditorPayload } from "../decorators/payload/EditorPayload";

/**
 * Retrieve a filtered and paginated list of comments for a specific FlexOffice
 * UI page.
 *
 * This endpoint fetches comments from the flex_office_page_comments table
 * filtered by the pageId provided in the path parameter and request body
 * filters including editor_id, search text, and pagination controls (page,
 * limit).
 *
 * Requires an authenticated editor role.
 *
 * @param props - Object containing editor payload, page ID, and request body
 *   filters
 * @param props.editor - Authenticated editor making the request
 * @param props.pageId - UUID of the FlexOffice UI page to retrieve comments for
 * @param props.body - Request body with filtering, search, and pagination
 *   parameters
 * @returns Paginated list of page comment summaries matching the filters
 * @throws {Error} When the specified page does not exist
 */
export async function patchflexOfficeEditorPagesPageIdPageComments(props: {
  editor: EditorPayload;
  pageId: string & tags.Format<"uuid">;
  body: IFlexOfficePageComment.IRequest;
}): Promise<IPageIFlexOfficePageComment.ISummary> {
  const { editor, pageId, body } = props;

  const page = await MyGlobal.prisma.flex_office_pages.findUnique({
    where: { id: pageId },
  });
  if (!page) {
    throw new Error("Page not found");
  }

  const pageNumber = body.page ?? 1;
  const pageSize = body.limit ?? 10;

  const whereConditions = {
    page_id: pageId,
    ...(body.editor_id !== undefined &&
      body.editor_id !== null && { editor_id: body.editor_id }),
    ...(body.search !== undefined &&
      body.search !== null && { content: { contains: body.search } }),
  };

  const [comments, total] = await Promise.all([
    MyGlobal.prisma.flex_office_page_comments.findMany({
      where: whereConditions,
      orderBy: { created_at: "desc" },
      skip: (pageNumber - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        content: true,
        created_at: true,
        editor_id: true,
      },
    }),
    MyGlobal.prisma.flex_office_page_comments.count({ where: whereConditions }),
  ]);

  return {
    pagination: {
      current: Number(pageNumber),
      limit: Number(pageSize),
      records: total,
      pages: Math.ceil(total / pageSize),
    },
    data: comments.map((comment) => ({
      id: comment.id,
      content: comment.content,
      created_at: toISOStringSafe(comment.created_at),
      editor_id: comment.editor_id,
    })),
  };
}
