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
 * Search and retrieve a paginated list of active page editors currently editing
 * pages with optional filtering.
 *
 * This operation supports filtering by page_id and editor_id to limit results.
 * Only non-deleted (where deleted_at is null) active sessions are returned.
 * Results are ordered by created_at descending.
 *
 * @param props - The authenticated editor and request body with filter and
 *   pagination parameters.
 * @param props.editor - The authenticated editor user making the request.
 * @param props.body - The request body containing pagination and optional
 *   filter criteria.
 * @returns A paginated summary list of active page editors matching filters.
 * @throws {Error} On database errors or invalid pagination parameters.
 */
export async function patchflexOfficeEditorPageEditors(props: {
  editor: EditorPayload;
  body: IFlexOfficePageEditor.IRequest;
}): Promise<IPageIFlexOfficePageEditor.ISummary> {
  const { body } = props;

  const page = (body.page ?? 1) > 0 ? (body.page ?? 1) : 1;
  const limit = (body.limit ?? 10) > 0 ? (body.limit ?? 10) : 10;
  const skip = (page - 1) * limit;

  const where = {
    deleted_at: null,
    ...(body.page_id !== undefined &&
      body.page_id !== null && { page_id: body.page_id }),
    ...(body.editor_id !== undefined &&
      body.editor_id !== null && { editor_id: body.editor_id }),
  };

  const [records, total] = await Promise.all([
    MyGlobal.prisma.flex_office_page_editors.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      select: { id: true, page_id: true, editor_id: true },
    }),
    MyGlobal.prisma.flex_office_page_editors.count({ where }),
  ]);

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: records.map((r) => ({
      id: r.id,
      page_id: r.page_id,
      editor_id: r.editor_id,
    })),
  };
}
