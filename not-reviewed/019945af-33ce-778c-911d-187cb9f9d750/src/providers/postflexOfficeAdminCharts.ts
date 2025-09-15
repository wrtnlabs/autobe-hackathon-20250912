import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeChart } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeChart";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Creates a new analytics chart within the FlexOffice system.
 *
 * This operation creates a new chart entity storing metadata and configuration
 * for various chart types associated with UI widgets. The creation is
 * restricted to authenticated admin users.
 *
 * @param props - Object containing the authenticated admin and chart creation
 *   data.
 * @param props.admin - Authenticated admin user performing the operation.
 * @param props.body - Chart creation details including widget association,
 *   chart type, and title.
 * @returns The newly created FlexOffice chart entity with all relevant fields.
 * @throws {Error} When the associated widget does not exist.
 */
export async function postflexOfficeAdminCharts(props: {
  admin: AdminPayload;
  body: IFlexOfficeChart.ICreate;
}): Promise<IFlexOfficeChart> {
  const { admin, body } = props;

  // Verify that the referenced widget exists
  const widget = await MyGlobal.prisma.flex_office_widgets.findUnique({
    where: { id: body.flex_office_widget_id },
  });
  if (!widget) {
    throw new Error(`Widget with id ${body.flex_office_widget_id} not found`);
  }

  // Prepare timestamps in ISO 8601 format
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // Generate new UUID for chart id
  const newId: string & tags.Format<"uuid"> = v4();

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
    },
  });

  // Return the created chart with proper date string formatting
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
