import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ViewerPayload } from "../decorators/payload/ViewerPayload";

/**
 * Permanently deletes a FlexOffice chart by its unique identifier.
 *
 * This function performs a hard delete on the `flex_office_charts` record,
 * removing it from the database completely. It first verifies that the chart
 * exists using `findUniqueOrThrow`, which will throw an error if the chart does
 * not exist.
 *
 * Only users with at least viewer role authorization can perform this
 * operation.
 *
 * @param props - Object containing the authenticated viewer and the target
 *   chartId
 * @param props.viewer - The authenticated viewer user
 * @param props.chartId - UUID of the chart to permanently delete
 * @returns Void
 * @throws {Error} Throws error if the chart does not exist or Prisma throws
 */
export async function deleteflexOfficeViewerChartsChartId(props: {
  viewer: ViewerPayload;
  chartId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { viewer, chartId } = props;

  // Verify chart existence (throws if not found)
  await MyGlobal.prisma.flex_office_charts.findUniqueOrThrow({
    where: { id: chartId },
    select: { id: true },
  });

  // Hard delete the chart
  await MyGlobal.prisma.flex_office_charts.delete({
    where: { id: chartId },
  });
}
