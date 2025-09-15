import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeMarketplaceWidget } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeMarketplaceWidget";
import { IPageIFlexOfficeMarketplaceWidget } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficeMarketplaceWidget";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieves a filtered, sorted, and paginated list of marketplace widgets from
 * the system. This endpoint provides advanced search capabilities to find
 * marketplace widgets by name, version, or description.
 *
 * Supports pagination parameters such as page number and size, searching by
 * keywords, and sorting by creation date or widget name.
 *
 * Only users with admin role may access this list due to the sensitivity of
 * marketplace widget management.
 *
 * @param props - Object containing admin authentication and request body
 * @param props.admin - Authenticated admin making the request
 * @param props.body - Request body containing search and pagination criteria
 * @returns Paginated list of marketplace widget summaries matching search
 *   criteria
 * @throws {Error} When any unexpected error occurs during database operations
 */
export async function patchflexOfficeAdminMarketplaceWidgets(props: {
  admin: AdminPayload;
  body: IFlexOfficeMarketplaceWidget.IRequest;
}): Promise<IPageIFlexOfficeMarketplaceWidget.ISummary> {
  const { body } = props;

  // Defaults
  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  // Build where clause
  const whereClause: Record<string, unknown> = {
    deleted_at: null,
  };

  if (
    body.search !== undefined &&
    body.search !== null &&
    body.search.trim() !== ""
  ) {
    const search = body.search.trim();
    whereClause.OR = [
      { name: { contains: search } },
      { version: { contains: search } },
      { description: { contains: search } },
    ];
  }

  // Determine order by
  const orderBy =
    body.sortBy === "name"
      ? { name: body.sortDir === "asc" ? "asc" : "desc" }
      : { created_at: body.sortDir === "asc" ? "asc" : "desc" };

  // Query data and count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.flex_office_marketplace_widgets.findMany({
      where: whereClause,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        widget_code: true,
        name: true,
        version: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.flex_office_marketplace_widgets.count({
      where: whereClause,
    }),
  ]);

  // Map to DTO
  const data = rows.map((row) => ({
    id: row.id,
    widget_code: row.widget_code,
    name: row.name,
    version: row.version,
    created_at: toISOStringSafe(row.created_at),
  }));

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
