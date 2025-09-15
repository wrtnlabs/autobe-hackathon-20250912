import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeEditConflicts } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditConflicts";
import { IPageIFlexOfficeEditConflicts } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficeEditConflicts";
import { EditorPayload } from "../decorators/payload/EditorPayload";

/**
 * Search and retrieve paginated list of edit conflicts
 *
 * Retrieves a filtered and paginated list of concurrent editing conflicts in
 * the FlexOffice platform. Supports filtering by page ID, editor ID, conflict
 * data search string, and created_at date range. Allows sorting and paging to
 * facilitate collaboration monitoring and resolution.
 *
 * @param props - Object containing authenticated editor and search filters
 * @param props.editor - The authenticated editor user making the request
 * @param props.body - Search and filter parameters for edit conflicts
 * @returns Paginated list of edit conflicts matching search criteria
 * @throws {Error} If invalid pagination parameters are provided
 */
export async function patchflexOfficeEditorEditConflicts(props: {
  editor: EditorPayload;
  body: IFlexOfficeEditConflicts.IRequest;
}): Promise<IPageIFlexOfficeEditConflicts.ISummary> {
  const { body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 10;

  if (page <= 0) {
    throw new Error("Invalid page number. Must be greater than 0.");
  }

  if (limit <= 0) {
    throw new Error("Invalid limit value. Must be greater than 0.");
  }

  const where: Partial<Prisma.flex_office_edit_conflictsWhereInput> = {};

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

  const orderByField =
    typeof body.orderBy === "string" &&
    ["id", "created_at", "page_id", "editor_id"].includes(body.orderBy)
      ? body.orderBy
      : "id";

  const orderDir = body.orderDir === "desc" ? "desc" : "asc";

  const skip = (page - 1) * limit;

  const [results, total] = await Promise.all([
    MyGlobal.prisma.flex_office_edit_conflicts.findMany({
      where,
      orderBy: { [orderByField]: orderDir },
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
      pages: Math.ceil(total / limit),
    },
    data: results.map((conflict) => ({
      id: conflict.id,
      page_id: conflict.page_id,
      editor_id: conflict.editor_id,
      created_at: toISOStringSafe(conflict.created_at),
    })),
  };
}
