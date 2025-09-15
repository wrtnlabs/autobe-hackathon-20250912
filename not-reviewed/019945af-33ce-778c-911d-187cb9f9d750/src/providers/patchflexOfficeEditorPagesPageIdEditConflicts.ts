import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeEditConflict } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditConflict";
import { IPageIFlexOfficeEditConflict } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficeEditConflict";
import { EditorPayload } from "../decorators/payload/EditorPayload";

/**
 * Searches and retrieves a paginated list of edit conflict records for a given
 * UI page.
 *
 * Provides filtering by page_id, editor_id, search on conflict_data JSON,
 * created_at date range, sorting and pagination.
 *
 * Only accessible by authenticated editors.
 *
 * @param props - Object containing authentication info, route parameter, and
 *   request filters
 * @param props.editor - Authenticated editor payload with id
 * @param props.pageId - UUID of the UI page to search conflicts for
 * @param props.body - Search filters and pagination info
 * @returns Paginated list of edit conflicts matching filters
 * @throws {Error} If invalid pageId or other database errors occur
 */
export async function patchflexOfficeEditorPagesPageIdEditConflicts(props: {
  editor: EditorPayload;
  pageId: string & tags.Format<"uuid">;
  body: IFlexOfficeEditConflict.IRequest;
}): Promise<IPageIFlexOfficeEditConflict> {
  const { editor, pageId, body } = props;

  // Base filter with mandatory pageId
  const where: {
    page_id: string & tags.Format<"uuid">;
    editor_id?: string & tags.Format<"uuid">;
    conflict_data?: { contains: string };
    created_at?: {
      gte?: string & tags.Format<"date-time">;
      lte?: string & tags.Format<"date-time">;
    };
  } = { page_id: pageId };

  if (body.page_id !== undefined && body.page_id !== null) {
    where.page_id = body.page_id;
  }
  if (body.editor_id !== undefined && body.editor_id !== null) {
    where.editor_id = body.editor_id;
  }
  if (
    body.conflict_data_search !== undefined &&
    body.conflict_data_search !== null
  ) {
    where.conflict_data = { contains: body.conflict_data_search };
  }
  if (
    (body.created_at_from !== undefined && body.created_at_from !== null) ||
    (body.created_at_to !== undefined && body.created_at_to !== null)
  ) {
    where.created_at = {};
    if (body.created_at_from !== undefined && body.created_at_from !== null) {
      where.created_at.gte = body.created_at_from;
    }
    if (body.created_at_to !== undefined && body.created_at_to !== null) {
      where.created_at.lte = body.created_at_to;
    }
  }

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0>;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0>;
  const skip = (page - 1) * limit;

  const orderByField = body.orderBy ?? "created_at";
  const orderDirection = body.orderDir ?? "desc";

  const [results, total] = await Promise.all([
    MyGlobal.prisma.flex_office_edit_conflicts.findMany({
      where,
      orderBy: { [orderByField]: orderDirection },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.flex_office_edit_conflicts.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data: results.map((c) => ({
      id: c.id,
      page_id: c.page_id,
      editor_id: c.editor_id,
      conflict_data: c.conflict_data,
      created_at: toISOStringSafe(c.created_at),
    })),
  };
}
