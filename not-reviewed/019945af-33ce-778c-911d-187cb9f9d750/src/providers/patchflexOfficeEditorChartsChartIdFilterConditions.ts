import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeFilterCondition } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeFilterCondition";
import { IPageIFlexOfficeFilterCondition } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficeFilterCondition";
import { EditorPayload } from "../decorators/payload/EditorPayload";

/**
 * Retrieve a paginated and filtered list of filter conditions for a specific
 * chart.
 *
 * This function allows an authenticated editor to query filter conditions
 * related to a given chart ID. The returned data include pagination metadata
 * and a list of filter condition summaries.
 *
 * @param props - Object containing editor authentication, chart ID, and request
 *   filters with pagination.
 * @param props.editor - Authenticated editor user payload
 * @param props.chartId - UUID string of the chart to query
 * @param props.body - Request body containing filter criteria and pagination
 *   options
 * @returns Paginated summary of filter conditions matching criteria
 * @throws {Error} Throws if any database operation fails or required inputs are
 *   invalid
 */
export async function patchflexOfficeEditorChartsChartIdFilterConditions(props: {
  editor: EditorPayload;
  chartId: string & tags.Format<"uuid">;
  body: IFlexOfficeFilterCondition.IRequest;
}): Promise<IPageIFlexOfficeFilterCondition.ISummary> {
  const { editor, chartId, body } = props;

  // Use default pagination parameters
  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  // Build where clause for Prisma filtering
  const where = {
    flex_office_chart_id: chartId,
    deleted_at: null,
    ...(body.filter_expression !== undefined && body.filter_expression !== null
      ? { filter_expression: { contains: body.filter_expression } }
      : {}),
    ...(body.enabled !== undefined && body.enabled !== null
      ? { enabled: body.enabled }
      : {}),
    ...(body.flex_office_widget_id !== undefined &&
    body.flex_office_widget_id !== null
      ? { flex_office_widget_id: body.flex_office_widget_id }
      : {}),
  };

  // Query filter conditions and total count concurrently
  const [results, total] = await Promise.all([
    MyGlobal.prisma.flex_office_filter_conditions.findMany({
      where: where,
      orderBy: { created_at: "desc" },
      skip: skip,
      take: limit,
    }),
    MyGlobal.prisma.flex_office_filter_conditions.count({ where: where }),
  ]);

  // Map results to API DTO, convert created_at dates to ISO strings
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map(({ id, flex_office_chart_id, enabled, created_at }) => ({
      id,
      flex_office_chart_id,
      enabled,
      created_at: toISOStringSafe(created_at),
    })),
  };
}
