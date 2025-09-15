import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeEditConflicts } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditConflicts";
import { IPageIFlexOfficeEditConflicts } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficeEditConflicts";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Search and retrieve a paginated list of edit conflicts.
 *
 * Retrieves filtered edit conflicts occurring on UI pages in the FlexOffice
 * system. Supports filtering by page id, editor id, conflict data text, and
 * creation date range. Pagination and sorting options are provided.
 *
 * @param props - Object containing the authenticated admin user and filter
 *   parameters.
 * @param props.admin - Authenticated admin payload with valid permissions.
 * @param props.body - Filter and pagination request parameters.
 * @returns Paginated summary of edit conflicts matching the filters.
 * @throws {Error} When database fetch fails or invalid parameters.
 */
export async function patchflexOfficeAdminEditConflicts(props: {
  admin: AdminPayload;
  body: IFlexOfficeEditConflicts.IRequest;
}): Promise<IPageIFlexOfficeEditConflicts.ISummary> {
  const { body } = props;

  const page = body.page ?? (1 as number & tags.Type<"int32">);
  const limit = body.limit ?? (10 as number & tags.Type<"int32">);
  const skip = (page - 1) * limit;

  // Build where conditions applying necessary filter checks
  const where: Record<string, unknown> = {};
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

  // Validate order by field is a known column to prevent SQL injection or errors
  const allowedOrderFields = ["id", "page_id", "editor_id", "created_at"];
  const orderByField = allowedOrderFields.includes(body.orderBy ?? "")
    ? body.orderBy!
    : "created_at";
  const orderDirection = body.orderDir === "asc" ? "asc" : "desc";

  // Fetch data and total count concurrently for pagination
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.flex_office_edit_conflicts.findMany({
      where,
      orderBy: { [orderByField]: orderDirection },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.flex_office_edit_conflicts.count({ where }),
  ]);

  // Transform database records to API response format
  const data = rows.map((row) => ({
    id: row.id,
    page_id: row.page_id,
    editor_id: row.editor_id,
    created_at: toISOStringSafe(row.created_at),
  }));

  // Return paginated results with pagination info
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
