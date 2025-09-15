import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeFilterCondition } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeFilterCondition";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve specific filter condition details by chart and condition ID
 *
 * Fetch detailed information about a particular filter condition by its unique
 * identifier within the context of a specific chart.
 *
 * This endpoint enforces authorization to ensure that only allowed users such
 * as those with admin or editor roles can access the condition details.
 *
 * @param props - Object containing admin payload, chartId, and
 *   filterConditionId
 * @param props.admin - The authenticated admin performing the operation
 * @param props.chartId - Unique identifier of the target chart
 * @param props.filterConditionId - Unique identifier of the target filter
 *   condition
 * @returns Detailed filter condition information
 * @throws {Error} If the filter condition does not exist or user is
 *   unauthorized
 */
export async function getflexOfficeAdminChartsChartIdFilterConditionsFilterConditionId(props: {
  admin: AdminPayload;
  chartId: string;
  filterConditionId: string;
}): Promise<IFlexOfficeFilterCondition> {
  const { admin, chartId, filterConditionId } = props;

  const filterCondition =
    await MyGlobal.prisma.flex_office_filter_conditions.findFirstOrThrow({
      where: {
        id: filterConditionId,
        flex_office_chart_id: chartId,
        deleted_at: null,
      },
    });

  return {
    id: filterCondition.id,
    flex_office_chart_id: filterCondition.flex_office_chart_id,
    flex_office_widget_id: filterCondition.flex_office_widget_id ?? null,
    filter_expression: filterCondition.filter_expression,
    enabled: filterCondition.enabled,
    created_at: toISOStringSafe(filterCondition.created_at),
    updated_at: toISOStringSafe(filterCondition.updated_at),
  };
}
