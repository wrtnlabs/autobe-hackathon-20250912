import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeKpiWidget } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeKpiWidget";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update an existing KPI widget with new configuration and metadata.
 *
 * This operation allows authorized admins to update a KPI widget identified by
 * `kpiWidgetId` in the system. The update may modify the linked UI widget
 * reference and the JSON configuration of the KPI widget.
 *
 * @param props - Object containing admin authentication, KPI widget ID, and
 *   update data
 * @param props.admin - The authenticated admin performing the update operation
 * @param props.kpiWidgetId - UUID of the KPI widget to be updated
 * @param props.body - Partial update data conforming to
 *   IFlexOfficeKpiWidget.IUpdate
 * @returns The fully updated KPI widget entity reflecting all current data
 * @throws {Error} Throws if the KPI widget with specified ID does not exist
 */
export async function putflexOfficeAdminWidgetsKpiKpiWidgetId(props: {
  admin: AdminPayload;
  kpiWidgetId: string & tags.Format<"uuid">;
  body: IFlexOfficeKpiWidget.IUpdate;
}): Promise<IFlexOfficeKpiWidget> {
  const { admin, kpiWidgetId, body } = props;

  // Confirm the KPI widget exists
  await MyGlobal.prisma.flex_office_kpi_widgets.findUniqueOrThrow({
    where: { id: kpiWidgetId },
  });

  const now = toISOStringSafe(new Date());

  // Update with provided fields and updated_at timestamp
  const updated = await MyGlobal.prisma.flex_office_kpi_widgets.update({
    where: { id: kpiWidgetId },
    data: {
      ...(body.flex_office_widget_id !== undefined && {
        flex_office_widget_id: body.flex_office_widget_id,
      }),
      ...(body.config_json !== undefined && { config_json: body.config_json }),
      updated_at: now,
    },
  });

  // Return updated KPI widget with date fields properly converted
  return {
    id: updated.id,
    flex_office_widget_id: updated.flex_office_widget_id,
    config_json: updated.config_json,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
