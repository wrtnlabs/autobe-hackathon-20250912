import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeChart } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeChart";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Updates an existing analytics chart by chartId.
 *
 * This endpoint modifies chart properties such as linked widget ID, chart type,
 * title, and optional description fields. Only admins are authorized to perform
 * this update. The existing chart must be validated to exist before update.
 *
 * All timestamps are converted to ISO string format with proper branding.
 *
 * @param props - Object containing admin payload, chart ID, and update data
 * @param props.admin - Authenticated admin performing the update
 * @param props.chartId - Unique identifier of the target chart
 * @param props.body - Update data for the chart, may partially include fields
 * @returns The updated chart entity with all fields and proper date formats
 * @throws {Error} If the chart with chartId does not exist
 */
export async function putflexOfficeAdminChartsChartId(props: {
  admin: AdminPayload;
  chartId: string & tags.Format<"uuid">;
  body: IFlexOfficeChart.IUpdate;
}): Promise<IFlexOfficeChart> {
  const { admin, chartId, body } = props;

  // Verify the chart exists; throws if not
  await MyGlobal.prisma.flex_office_charts.findUniqueOrThrow({
    where: { id: chartId },
  });

  const updated = await MyGlobal.prisma.flex_office_charts.update({
    where: { id: chartId },
    data: {
      flex_office_widget_id: body.flex_office_widget_id ?? undefined,
      chart_type: body.chart_type ?? undefined,
      title: body.title ?? undefined,
      description: body.description ?? undefined,
    },
  });

  return {
    id: updated.id,
    flex_office_widget_id: updated.flex_office_widget_id,
    chart_type: updated.chart_type,
    title: updated.title,
    description: updated.description ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
