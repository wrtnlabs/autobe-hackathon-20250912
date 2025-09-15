import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeFilterCondition } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeFilterCondition";
import { IPageIFlexOfficeFilterCondition } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficeFilterCondition";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Search and retrieve filter conditions for a specific chart.
 *
 * Retrieves a paginated, filtered list of filter conditions linked to the given
 * chart ID, supporting optional filtering by expression, enabled status, and
 * widget association. Only active (non-deleted) conditions are included,
 * ordered by creation date descending.
 *
 * @param props - Object containing the authenticated admin, chart ID, and
 *   request filters.
 * @param props.admin - The authenticated admin performing the request.
 * @param props.chartId - The UUID of the target chart.
 * @param props.body - Search and pagination criteria.
 * @returns A paginated summary of filter conditions matching the criteria.
 * @throws {Error} When any database operation fails.
 */
export async function patchflexOfficeAdminChartsChartIdFilterConditions(props: {
  admin: AdminPayload;
  chartId: string;
  body: IFlexOfficeFilterCondition.IRequest;
}): Promise<IPageIFlexOfficeFilterCondition.ISummary> {
  const { admin, chartId, body } = props;

  // Set default pagination values
  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  // Build the where condition with proper null and undefined checks
  const whereCondition = {
    flex_office_chart_id: chartId,
    deleted_at: null,
    ...(body.filter_expression !== undefined &&
      body.filter_expression !== null && {
        filter_expression: { contains: body.filter_expression },
      }),
    ...(body.enabled !== undefined &&
      body.enabled !== null && {
        enabled: body.enabled,
      }),
    ...(body.flex_office_widget_id !== undefined &&
      body.flex_office_widget_id !== null && {
        flex_office_widget_id: body.flex_office_widget_id,
      }),
  };

  // Query database
  const [results, total] = await Promise.all([
    MyGlobal.prisma.flex_office_filter_conditions.findMany({
      where: whereCondition,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        flex_office_chart_id: true,
        enabled: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.flex_office_filter_conditions.count({
      where: whereCondition,
    }),
  ]);

  // Return paginated results with proper date-time string formatting
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((item) => ({
      id: item.id,
      flex_office_chart_id: item.flex_office_chart_id,
      enabled: item.enabled,
      created_at: toISOStringSafe(item.created_at),
    })),
  };
}
