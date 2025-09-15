import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeWidgetInstallation } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeWidgetInstallation";
import { IPageIFlexOfficeWidgetInstallation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficeWidgetInstallation";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * List widget installations for a marketplace widget.
 *
 * Fetches a paginated list of UI page installations for a specified marketplace
 * widget by UUID. Supports optional filtering, search, and sorting criteria.
 * Restricted to admin role.
 *
 * @param props - Object containing:
 *
 *   - Admin: The authenticated admin user performing the request.
 *   - WidgetId: UUID of the marketplace widget to filter installations.
 *   - Body: Request body containing pagination, filtering, and search params.
 *
 * @returns Paginated summary list of widget installations.
 * @throws Error if DB query fails or parameters are invalid.
 */
export async function patchflexOfficeAdminMarketplaceWidgetsWidgetIdInstallations(props: {
  admin: AdminPayload;
  widgetId: string & tags.Format<"uuid">;
  body: IFlexOfficeWidgetInstallation.IRequest;
}): Promise<IPageIFlexOfficeWidgetInstallation.ISummary> {
  const { admin, widgetId, body } = props;

  const page = body.page ?? 0;
  const limit = body.limit ?? 10;

  const whereConditions = {
    marketplace_widget_id: widgetId,
    deleted_at: null,
  } as const;

  const where: typeof whereConditions & {
    page_id?: string & tags.Format<"uuid">;
    OR?:
      | {
          page_id?:
            | {
                contains: string;
              }
            | undefined;
          configuration_data?:
            | {
                contains: string;
              }
            | undefined;
        }
      | undefined;
  } = { ...whereConditions };

  if (body.filterByPageId !== undefined && body.filterByPageId !== null) {
    where.page_id = body.filterByPageId;
  }

  if (body.search !== undefined && body.search !== null) {
    where.OR = [
      { page_id: { contains: body.search } },
      { configuration_data: { contains: body.search } },
    ];
  }

  const sortField = body.sortBy ?? "created_at";
  const sortOrder = body.sortOrder === "asc" ? "asc" : "desc";

  const [results, totalRecords] = await Promise.all([
    MyGlobal.prisma.flex_office_widget_installations.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip: page * limit,
      take: limit,
      select: {
        id: true,
        marketplace_widget_id: true,
        page_id: true,
        installation_date: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.flex_office_widget_installations.count({
      where,
    }),
  ]);

  const data = results.map((item) => ({
    id: item.id,
    marketplace_widget_id: item.marketplace_widget_id,
    page_id: item.page_id,
    installation_date: toISOStringSafe(item.installation_date),
    created_at: toISOStringSafe(item.created_at),
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: totalRecords,
      pages: Math.ceil(totalRecords / limit),
    },
    data,
  };
}
