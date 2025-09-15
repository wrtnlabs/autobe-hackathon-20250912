import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficePageEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePageEditor";
import { IPageIFlexOfficePageEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficePageEditor";
import { EditorPayload } from "../decorators/payload/EditorPayload";

/**
 * Lists editor sessions for a specific UI page with filtering and pagination.
 *
 * This endpoint provides active editor sessions associated with a UI page,
 * allowing filtering by page and editor IDs. It supports pagination and sorts
 * sessions by creation date descending.
 *
 * Authorization: Requires an authenticated editor (props.editor).
 *
 * @param props - Object containing the authenticated editor, pageId, and
 *   request body.
 * @param props.editor - The authenticated editor making the request.
 * @param props.pageId - UUID of the UI page to query editor sessions.
 * @param props.body - Request body containing pagination and filter criteria.
 * @returns Paginated list of page editor session summaries.
 * @throws Error when the pageId or filtering parameters are invalid.
 */
export async function patchflexOfficeEditorPagesPageIdPageEditors(props: {
  editor: EditorPayload;
  pageId: string & tags.Format<"uuid">;
  body: IFlexOfficePageEditor.IRequest;
}): Promise<IPageIFlexOfficePageEditor.ISummary> {
  const { editor, pageId, body } = props;

  // Pagination defaults and normalization
  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const skip = (page - 1) * limit;

  // Build Prisma where condition
  const where = {
    deleted_at: null,
    page_id: pageId,
  } as const;

  // Conditionally add filters
  const filteredWhere = {
    ...where,
    ...(body.page_id !== undefined && body.page_id !== null
      ? { page_id: body.page_id }
      : {}),
    ...(body.editor_id !== undefined && body.editor_id !== null
      ? { editor_id: body.editor_id }
      : {}),
  };

  const [results, total] = await Promise.all([
    MyGlobal.prisma.flex_office_page_editors.findMany({
      where: filteredWhere,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      select: { id: true, page_id: true, editor_id: true },
    }),
    MyGlobal.prisma.flex_office_page_editors.count({ where: filteredWhere }),
  ]);

  // Map results to the expected summary format
  const data = results.map((r) => ({
    id: r.id,
    page_id: r.page_id,
    editor_id: r.editor_id,
  }));

  // Compose pagination info
  const pagination = {
    current: Number(page),
    limit: Number(limit),
    records: total,
    pages: Math.ceil(total / limit),
  };

  return { pagination, data };
}
