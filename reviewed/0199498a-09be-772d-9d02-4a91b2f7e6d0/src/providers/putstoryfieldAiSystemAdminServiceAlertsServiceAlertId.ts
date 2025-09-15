import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IStoryfieldAiServiceAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiServiceAlert";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Updates an existing service alert record by service alert ID.
 *
 * Only authenticated system admin users are permitted to update alerts. The
 * function allows updating the alert_type, alert_code, content, environment,
 * resolved status, and resolution_note. The updated_at timestamp is always set
 * to the current time. If the alert is not found or is already soft-deleted, an
 * error is thrown.
 *
 * @param props - Operation parameters
 * @param props.systemAdmin - The authenticated system admin performing the
 *   update
 * @param props.serviceAlertId - UUID of alert record to update
 * @param props.body - Fields to update
 * @returns The updated IStoryfieldAiServiceAlert object
 * @throws {Error} If the service alert does not exist or is deleted
 */
export async function putstoryfieldAiSystemAdminServiceAlertsServiceAlertId(props: {
  systemAdmin: SystemadminPayload;
  serviceAlertId: string & tags.Format<"uuid">;
  body: IStoryfieldAiServiceAlert.IUpdate;
}): Promise<IStoryfieldAiServiceAlert> {
  const { systemAdmin, serviceAlertId, body } = props;

  // Fetch the target service alert, ensuring it exists and is not soft-deleted
  const alert = await MyGlobal.prisma.storyfield_ai_service_alerts.findFirst({
    where: {
      id: serviceAlertId,
      deleted_at: null,
    },
  });
  if (!alert) {
    throw new Error("Service alert not found or is deleted");
  }

  // Update fields in-place, skipping undefined fields (Prisma convention)
  const updated = await MyGlobal.prisma.storyfield_ai_service_alerts.update({
    where: { id: serviceAlertId },
    data: {
      alert_type: body.alert_type ?? undefined,
      alert_code: body.alert_code ?? undefined,
      content: body.content ?? undefined,
      environment: body.environment ?? undefined,
      resolved: body.resolved ?? undefined,
      resolution_note: body.resolution_note ?? undefined,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Return all required fields, mapping dates and nullable/optional fields
  return {
    id: updated.id,
    alert_type: updated.alert_type,
    alert_code: updated.alert_code,
    content: updated.content,
    environment: updated.environment,
    resolved: updated.resolved,
    resolution_note: updated.resolution_note ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
