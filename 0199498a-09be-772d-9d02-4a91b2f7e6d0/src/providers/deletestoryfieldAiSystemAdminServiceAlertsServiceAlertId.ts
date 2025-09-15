import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Soft deletes (logically removes) a service alert record for system
 * administration.
 *
 * This operation sets the deleted_at field to the current timestamp for the
 * specified alert, marking it as removed (soft deleted) for audit and
 * compliance. If the alert does not exist or is already deleted, an error is
 * thrown and audit is logged. Only authenticated system administrators may
 * perform this operation. All deletion attempts (successful or failed) are
 * logged for administrative audit.
 *
 * @param props - The input containing the system administrator's identity and
 *   the unique service alert ID to delete.
 * @param props.systemAdmin - Authenticated SystemadminPayload from the request
 *   context.
 * @param props.serviceAlertId - UUID of the service alert to be soft deleted.
 * @returns Void
 * @throws {Error} If the alert does not exist or has already been deleted.
 */
export async function deletestoryfieldAiSystemAdminServiceAlertsServiceAlertId(props: {
  systemAdmin: SystemadminPayload;
  serviceAlertId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { systemAdmin, serviceAlertId } = props;
  // Step 1: Fetch alert by id and ensure it's not already deleted
  const alert = await MyGlobal.prisma.storyfield_ai_service_alerts.findFirst({
    where: {
      id: serviceAlertId,
      deleted_at: null,
    },
  });
  const now = toISOStringSafe(new Date());
  if (!alert) {
    // Audit log: failed attempt
    await MyGlobal.prisma.storyfield_ai_integration_logs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        storyfield_ai_authenticateduser_id: null,
        storyfield_ai_story_id: null,
        event_type: "SERVICE_ALERT_DELETE_FAIL",
        subsystem: "system_alerts",
        status: "FAILURE",
        message: `Attempted to delete service alert ${serviceAlertId} by system admin ${systemAdmin.id}, but it was not found or already deleted`,
        request_id: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
    throw new Error("Service alert not found or already deleted");
  }
  // Soft delete the alert (set deleted_at)
  await MyGlobal.prisma.storyfield_ai_service_alerts.update({
    where: { id: serviceAlertId },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
  // Audit log: successful deletion
  await MyGlobal.prisma.storyfield_ai_integration_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      storyfield_ai_authenticateduser_id: null,
      storyfield_ai_story_id: null,
      event_type: "SERVICE_ALERT_DELETE_SUCCESS",
      subsystem: "system_alerts",
      status: "SUCCESS",
      message: `Service alert ${serviceAlertId} deleted by system admin ${systemAdmin.id}`,
      request_id: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  return;
}
