import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeChart } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeChart";
import { ViewerPayload } from "../decorators/payload/ViewerPayload";

/**
 * Creates a new analytics chart in the FlexOffice system.
 *
 * This function allows an authenticated viewer user to create a new chart
 * metadata entity linked to an existing UI widget by ID. The chart can specify
 * visualization type, title, and optional description. Creation timestamps and
 * soft delete flags are managed by the backend.
 *
 * @param props - Object containing the viewer user payload and chart creation
 *   data
 * @param props.viewer - The authenticated viewer user creating the chart
 * @param props.body - The chart data for creation including widget ID, chart
 *   type, title, description
 * @returns The newly created chart entity including all fields and timestamps
 * @throws {Error} Throws error if database operation fails or inputs are
 *   invalid
 */
export async function postflexOfficeViewerCharts(props: {
  viewer: ViewerPayload;
  body: IFlexOfficeChart.ICreate;
}): Promise<IFlexOfficeChart> {
  const { viewer, body } = props;

  // Generate a new UUID for the chart id
  const newId = typia.assert<string & tags.Format<"uuid">>(v4());

  // Current timestamp in ISO string format
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // Create the new chart record in the database
  const created = await MyGlobal.prisma.flex_office_charts.create({
    data: {
      id: newId,
      flex_office_widget_id: body.flex_office_widget_id,
      chart_type: body.chart_type,
      title: body.title,
      description: body.description ?? null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // Return the created chart entity with all dates converted safely
  return {
    id: created.id,
    flex_office_widget_id: created.flex_office_widget_id,
    chart_type: created.chart_type,
    title: created.title,
    description: created.description ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
