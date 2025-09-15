import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IStoryfieldAiServiceAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiServiceAlert";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Get details for a service alert event record by ID
 * (storyfield_ai_service_alerts table).
 *
 * This operation allows system administrators to retrieve detailed information
 * about a specific service alert event by unique ID. Only users with the
 * systemAdmin role (enforced via SystemadminAuth decorator and
 * SystemadminPayload) may access this endpoint, supporting incident review and
 * compliance retrieval. Returns all attributes of the event including type,
 * code, content, environment, resolution status, timestamps, and notes. Throws
 * an error if the alert record is not found (or has been soft-deleted).
 *
 * @param props - Input containing the authenticated system admin context and
 *   the unique UUID of the service alert
 * @param props.systemAdmin - The authenticated SystemadminPayload as
 *   authorization context
 * @param props.serviceAlertId - The UUID of the service alert event to retrieve
 * @returns IStoryfieldAiServiceAlert record detailing the event
 * @throws {Error} If the service alert record is not found or has been deleted
 */
export async function getstoryfieldAiSystemAdminServiceAlertsServiceAlertId(props: {
  systemAdmin: SystemadminPayload;
  serviceAlertId: string & tags.Format<"uuid">;
}): Promise<IStoryfieldAiServiceAlert> {
  const { systemAdmin, serviceAlertId } = props;

  const alert = await MyGlobal.prisma.storyfield_ai_service_alerts.findFirst({
    where: { id: serviceAlertId, deleted_at: null },
  });
  if (!alert) {
    throw new Error("Service alert not found");
  }

  return {
    id: alert.id,
    alert_type: alert.alert_type,
    alert_code: alert.alert_code,
    content: alert.content,
    environment: alert.environment,
    resolved: alert.resolved,
    resolution_note:
      alert.resolution_note !== undefined && alert.resolution_note !== null
        ? alert.resolution_note
        : null,
    created_at: toISOStringSafe(alert.created_at),
    updated_at: toISOStringSafe(alert.updated_at),
    deleted_at:
      alert.deleted_at !== undefined && alert.deleted_at !== null
        ? toISOStringSafe(alert.deleted_at)
        : null,
  };
}
