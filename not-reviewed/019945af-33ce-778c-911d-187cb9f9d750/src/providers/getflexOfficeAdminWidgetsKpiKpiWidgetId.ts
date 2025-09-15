import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeKpiWidget } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeKpiWidget";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Get detailed information on a specific KPI widget.
 *
 * Retrieves a KPI widget identified by kpiWidgetId from the database. Only
 * accessible to authenticated admin users.
 *
 * @param props - Object containing admin payload and KPI widget ID.
 * @param props.admin - The authenticated admin user making the request.
 * @param props.kpiWidgetId - UUID of the KPI widget to retrieve.
 * @returns The KPI widget data including configuration and timestamps.
 * @throws {Error} When the KPI widget with specified ID does not exist.
 */
export async function getflexOfficeAdminWidgetsKpiKpiWidgetId(props: {
  admin: AdminPayload;
  kpiWidgetId: string & tags.Format<"uuid">;
}): Promise<IFlexOfficeKpiWidget> {
  const { admin, kpiWidgetId } = props;

  const kpiWidget =
    await MyGlobal.prisma.flex_office_kpi_widgets.findUniqueOrThrow({
      where: { id: kpiWidgetId },
    });

  return {
    id: kpiWidget.id,
    flex_office_widget_id: kpiWidget.flex_office_widget_id,
    config_json: kpiWidget.config_json,
    created_at: toISOStringSafe(kpiWidget.created_at),
    updated_at: toISOStringSafe(kpiWidget.updated_at),
    deleted_at: kpiWidget.deleted_at
      ? toISOStringSafe(kpiWidget.deleted_at)
      : null,
  };
}
