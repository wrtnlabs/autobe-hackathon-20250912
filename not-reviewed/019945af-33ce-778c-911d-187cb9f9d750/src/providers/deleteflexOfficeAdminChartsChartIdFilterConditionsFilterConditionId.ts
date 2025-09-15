import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Delete a specific filter condition of a chart in FlexOffice analytics.
 *
 * This endpoint permanently removes a filter condition associated with a given
 * chart. Only an admin user can perform this operation.
 *
 * @param props - Object containing admin payload and identifiers for chart and
 *   filter condition
 * @param props.admin - Authenticated admin performing the deletion
 * @param props.chartId - UUID string of the target chart
 * @param props.filterConditionId - UUID string of the filter condition to
 *   delete
 * @throws {Error} Throws if the filter condition does not exist or does not
 *   belong to the chart
 */
export async function deleteflexOfficeAdminChartsChartIdFilterConditionsFilterConditionId(props: {
  admin: AdminPayload;
  chartId: string & tags.Format<"uuid">;
  filterConditionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, chartId, filterConditionId } = props;

  // Verify filter condition exists for given chart
  const filterCondition =
    await MyGlobal.prisma.flex_office_filter_conditions.findFirst({
      where: {
        id: filterConditionId,
        flex_office_chart_id: chartId,
      },
    });

  if (!filterCondition) {
    throw new Error("Filter condition not found");
  }

  // Delete filter condition
  await MyGlobal.prisma.flex_office_filter_conditions.delete({
    where: { id: filterConditionId },
  });

  return;
}
