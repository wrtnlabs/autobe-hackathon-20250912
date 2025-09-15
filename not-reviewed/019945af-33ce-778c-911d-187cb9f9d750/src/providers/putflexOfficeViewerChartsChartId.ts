import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeChart } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeChart";
import { ViewerPayload } from "../decorators/payload/ViewerPayload";

/**
 * Update an existing analytics chart by chartId
 *
 * This API endpoint updates the attributes of an existing analytics chart in
 * the FlexOffice platform. Authorized users with the viewer role can modify
 * chart properties such as chart type, title, and optional description.
 *
 * @param props - Object containing viewer payload, chartId and update body
 * @returns The updated IFlexOfficeChart object
 * @throws {Error} When the chart ID does not exist
 * @throws {Error} When the viewer is unauthorized to update the chart
 */
export async function putflexOfficeViewerChartsChartId(props: {
  viewer: ViewerPayload;
  chartId: string & tags.Format<"uuid">;
  body: IFlexOfficeChart.IUpdate;
}): Promise<IFlexOfficeChart> {
  const { viewer, chartId, body } = props;

  // 1) Verify chart existence
  const chart = await MyGlobal.prisma.flex_office_charts.findUniqueOrThrow({
    where: { id: chartId },
  });

  // 2) Authorization check by verifying linked widget exists
  const widget = await MyGlobal.prisma.flex_office_widgets.findUniqueOrThrow({
    where: { id: chart.flex_office_widget_id },
  });

  // 3) Prepare updated fields
  const now = toISOStringSafe(new Date());

  // Use undefined for fields not provided to skip updates
  const updateData: IFlexOfficeChart.IUpdate = {
    chart_type: body.chart_type ?? undefined,
    title: body.title ?? undefined,
    description: body.description ?? undefined,
  };

  // 4) Update chart
  const updated = await MyGlobal.prisma.flex_office_charts.update({
    where: { id: chartId },
    data: {
      ...updateData,
      updated_at: now,
    },
  });

  // 5) Return converted updated chart
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
