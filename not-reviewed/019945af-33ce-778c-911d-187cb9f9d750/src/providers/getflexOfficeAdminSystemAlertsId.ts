import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeSystemAlerts } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeSystemAlerts";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve detailed information of a system alert by its ID
 *
 * This function allows an admin user to fetch a system alert record from the
 * flex_office_system_alerts table by UUID. It ensures the alert exists and
 * returns all relevant fields, converting all dates to ISO strings.
 *
 * @param props - Object containing admin authorization and alert ID
 * @param props.admin - The authenticated admin user making the request
 * @param props.id - UUID of the system alert to retrieve
 * @returns Detailed system alert information conforming to
 *   IFlexOfficeSystemAlerts
 * @throws {Error} Throws if system alert with given ID does not exist
 */
export async function getflexOfficeAdminSystemAlertsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IFlexOfficeSystemAlerts> {
  const { admin, id } = props;

  const alert =
    await MyGlobal.prisma.flex_office_system_alerts.findUniqueOrThrow({
      where: { id },
    });

  return {
    id: alert.id as string & tags.Format<"uuid">,
    severity: alert.severity,
    message: alert.message,
    is_resolved: alert.is_resolved,
    created_at: toISOStringSafe(alert.created_at),
    updated_at: toISOStringSafe(alert.updated_at),
    resolved_at: alert.resolved_at ? toISOStringSafe(alert.resolved_at) : null,
  };
}
