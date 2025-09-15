import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeWidgetKpi } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeWidgetKpi";
import { IPageIFlexOfficeWidgetKpi } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficeWidgetKpi";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Lists KPI widgets with pagination, search, and sorting.
 *
 * This endpoint allows authorized admin users to fetch KPI widgets filtered by
 * search keyword inside config_json field, with pagination and sorting
 * capabilities.
 *
 * @param props - Contains admin authentication and request body with filters
 * @param props.admin - Authenticated admin user info
 * @param props.body - Filter and pagination criteria
 * @returns Paginated KPI widget summaries
 * @throws {Error} On unexpected database or input errors
 */
export async function patchflexOfficeAdminWidgetsKpi(props: {
  admin: AdminPayload;
  body: IFlexOfficeWidgetKpi.IRequest;
}): Promise<IPageIFlexOfficeWidgetKpi.ISummary> {
  const { admin, body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const skip = (page - 1) * limit;

  const where = {
    deleted_at: null as null,
    ...(body.search !== undefined &&
      body.search !== null && {
        config_json: {
          contains: body.search,
        },
      }),
  };

  const orderBy =
    body.orderBy !== undefined && body.orderBy !== null
      ? { [body.orderBy]: body.orderDirection === "asc" ? "asc" : "desc" }
      : { created_at: "desc" };

  const [data, total] = await Promise.all([
    MyGlobal.prisma.flex_office_kpi_widgets.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        flex_office_widget_id: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.flex_office_kpi_widgets.count({
      where,
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map((item) => ({
      id: item.id as string & tags.Format<"uuid">,
      flex_office_widget_id: item.flex_office_widget_id as string &
        tags.Format<"uuid">,
      created_at: toISOStringSafe(item.created_at),
    })),
  };
}
