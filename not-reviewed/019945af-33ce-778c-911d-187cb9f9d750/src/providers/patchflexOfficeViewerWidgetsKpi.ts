import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeWidgetKpi } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeWidgetKpi";
import { IPageIFlexOfficeWidgetKpi } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficeWidgetKpi";
import { ViewerPayload } from "../decorators/payload/ViewerPayload";

/**
 * Retrieves a paginated list of KPI widgets available to the viewer role.
 *
 * This API endpoint allows authorized viewer users to fetch KPI widgets with
 * optional search, pagination, and sorting parameters. It filters out
 * soft-deleted records and returns summaries containing essential fields.
 *
 * @param props - Object containing viewer identity and request filtering info
 * @param props.viewer - Authenticated viewer making the request
 * @param props.body - Filtering, pagination and sorting criteria
 * @returns A paginated summary list of KPI widgets
 * @throws {Error} When any database operation fails
 */
export async function patchflexOfficeViewerWidgetsKpi(props: {
  viewer: ViewerPayload;
  body: IFlexOfficeWidgetKpi.IRequest;
}): Promise<IPageIFlexOfficeWidgetKpi.ISummary> {
  const { viewer, body } = props;

  // Normalize pagination parameters
  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0>;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0>;
  const skip = (page - 1) * limit;

  // Validate allowed orderBy fields to prevent Prisma errors
  const allowedOrderByFields = [
    "id",
    "flex_office_widget_id",
    "created_at",
    "updated_at",
  ];
  const orderByField = allowedOrderByFields.includes(body.orderBy ?? "")
    ? (body.orderBy ?? "created_at")
    : "created_at";
  const orderDirection = body.orderDirection === "asc" ? "asc" : "desc";

  // Build Prisma where condition with soft delete and optional search
  const whereCondition = {
    deleted_at: null,
    ...(body.search !== undefined &&
    body.search !== null &&
    body.search.trim() !== ""
      ? { config_json: { contains: body.search } }
      : {}),
  };

  // Fetch filtered, paginated data and total count concurrently
  const [widgets, total] = await Promise.all([
    MyGlobal.prisma.flex_office_kpi_widgets.findMany({
      where: whereCondition,
      orderBy: { [orderByField]: orderDirection },
      skip,
      take: limit,
      select: {
        id: true,
        flex_office_widget_id: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.flex_office_kpi_widgets.count({
      where: whereCondition,
    }),
  ]);

  // Transform results to expected return format with proper date conversion
  const data = widgets.map((widget) => ({
    id: widget.id,
    flex_office_widget_id: widget.flex_office_widget_id,
    created_at: toISOStringSafe(widget.created_at),
  }));

  // Construct pagination metadata
  const pagination = {
    current: Number(page),
    limit: Number(limit),
    records: total,
    pages: Math.ceil(total / limit),
  };

  return {
    pagination,
    data,
  };
}
