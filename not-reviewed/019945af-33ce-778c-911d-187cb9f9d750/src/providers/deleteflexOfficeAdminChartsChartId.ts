import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Deletes an existing FlexOffice analytics chart permanently by its unique
 * identifier (chartId).
 *
 * This operation enforces authorization checks by requiring a valid admin
 * payload. It first verifies the chart exists, then performs a hard delete,
 * removing the chart and all related records.
 *
 * @param props - Object containing the admin authentication and the unique
 *   chartId to delete.
 * @param props.admin - The authenticated admin performing this operation.
 * @param props.chartId - The UUID of the chart to be permanently deleted.
 * @throws {Error} If the specified chart does not exist.
 */
export async function deleteflexOfficeAdminChartsChartId(props: {
  admin: AdminPayload;
  chartId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, chartId } = props;

  // Ensure the chart exists or throw
  await MyGlobal.prisma.flex_office_charts.findUniqueOrThrow({
    where: { id: chartId },
  });

  // Hard delete the chart
  await MyGlobal.prisma.flex_office_charts.delete({
    where: { id: chartId },
  });
}
