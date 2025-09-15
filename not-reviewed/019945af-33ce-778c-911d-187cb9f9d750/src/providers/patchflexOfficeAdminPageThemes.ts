import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficePageTheme } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePageTheme";
import { IPageIFlexOfficePageTheme } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficePageTheme";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Search and retrieve a filtered, paginated list of UI page themes.
 *
 * Retrieves active (non-deleted) FlexOffice page themes filtered by name
 * substring. Supports pagination with page number and limit, sorted by creation
 * date descending.
 *
 * @param props - Contains authenticated admin and request body with filter
 *   parameters.
 * @param props.admin - Authenticated admin user payload.
 * @param props.body - Filter and pagination parameters for search.
 * @returns Paginated summary list of page themes matching the filter criteria.
 * @throws {Error} Throws if database operation fails or parameters invalid.
 */
export async function patchflexOfficeAdminPageThemes(props: {
  admin: AdminPayload;
  body: IFlexOfficePageTheme.IRequest;
}): Promise<IPageIFlexOfficePageTheme.ISummary> {
  const { body } = props;

  // Set default pagination values
  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  // Build Prisma where object with soft delete and name filter
  const whereCondition = {
    deleted_at: null,
    ...(body.name !== undefined &&
      body.name !== null && { name: { contains: body.name } }),
  };

  // Perform parallel queries: data and count
  const [results, total] = await Promise.all([
    MyGlobal.prisma.flex_office_page_themes.findMany({
      where: whereCondition,
      select: { id: true, name: true },
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    }),
    MyGlobal.prisma.flex_office_page_themes.count({
      where: whereCondition,
    }),
  ]);

  // Compute pagination response
  const pagination = {
    current: Number(page),
    limit: Number(limit),
    records: total,
    pages: Math.ceil(total / limit),
  };

  // Map results to ISummary type
  const data = results.map((item) => ({
    id: item.id,
    name: item.name,
  }));

  return { pagination, data };
}
