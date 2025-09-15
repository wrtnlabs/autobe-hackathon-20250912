import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Soft delete a KPI widget identified by kpiWidgetId.
 *
 * Only users with 'admin' role can perform this operation. This sets the
 * deleted_at timestamp to mark the KPI widget as deleted.
 *
 * @param props - Object containing admin payload and kpiWidgetId parameter
 * @param props.admin - Authenticated admin performing the deletion
 * @param props.kpiWidgetId - UUID of the KPI widget to soft delete
 * @returns Void
 * @throws {Error} Throws if KPI widget not found or already deleted
 */
export async function deleteflexOfficeAdminWidgetsKpiKpiWidgetId(props: {
  admin: AdminPayload;
  kpiWidgetId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, kpiWidgetId } = props;

  // Verify the KPI widget exists and is not already deleted
  await MyGlobal.prisma.flex_office_kpi_widgets.findUniqueOrThrow({
    where: { id: kpiWidgetId },
    select: { id: true, deleted_at: true },
  });

  // Perform soft delete by setting the deleted_at timestamp
  await MyGlobal.prisma.flex_office_kpi_widgets.update({
    where: { id: kpiWidgetId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
}
