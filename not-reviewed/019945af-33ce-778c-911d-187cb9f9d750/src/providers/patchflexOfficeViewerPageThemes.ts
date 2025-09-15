import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficePageTheme } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePageTheme";
import { IPageIFlexOfficePageTheme } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficePageTheme";
import { ViewerPayload } from "../decorators/payload/ViewerPayload";

/**
 * Search and retrieve a filtered, paginated list of UI page themes.
 *
 * Retrieves FlexOffice UI page themes based on optional filters in the request
 * body. Supports pagination with default page=1 and limit=20, and sorts by
 * creation date descending. Excludes soft deleted themes by filtering
 * deleted_at to null.
 *
 * @param props - Object containing viewer authentication and request filters.
 * @param props.viewer - Authenticated viewer payload.
 * @param props.body - Request body with optional name filter and pagination
 *   params.
 * @returns Paginated list of UI page theme summaries.
 * @throws {Error} When underlying database operation fails.
 */
export async function patchflexOfficeViewerPageThemes(props: {
  viewer: ViewerPayload;
  body: IFlexOfficePageTheme.IRequest;
}): Promise<IPageIFlexOfficePageTheme.ISummary> {
  const { body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  const whereClause = {
    deleted_at: null,
    ...(body.name !== undefined &&
      body.name !== null && { name: { contains: body.name } }),
  };

  const [themes, total] = await Promise.all([
    MyGlobal.prisma.flex_office_page_themes.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: { id: true, name: true },
    }),
    MyGlobal.prisma.flex_office_page_themes.count({ where: whereClause }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: themes.map((theme) => ({ id: theme.id, name: theme.name })),
  };
}
