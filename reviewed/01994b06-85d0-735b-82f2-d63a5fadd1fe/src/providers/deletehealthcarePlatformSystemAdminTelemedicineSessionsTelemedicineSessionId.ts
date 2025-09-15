import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Permanently delete a telemedicine session by telemedicineSessionId
 * (TelemedicineSession table hard delete).
 *
 * This endpoint permanently removes the specified telemedicine session from the
 * platform. Only users with systemAdmin authorization may perform this action.
 * All deletions are logged for compliance. Deletion is irreversible and will
 * remove all session data forever.
 *
 * Authorization is enforced through the systemAdmin decorator; unauthorized
 * users will be denied earlier. If the session does not exist, a 404 error is
 * thrown. Compliance audit log is created, including actor id, action, and
 * session id.
 *
 * @param props - Operation arguments
 * @param props.systemAdmin - The authenticated SystemadminPayload executing the
 *   operation (MUST be a system administrator)
 * @param props.telemedicineSessionId - The UUID of the telemedicine session to
 *   delete (required)
 * @returns Void (no return value)
 * @throws {Error} If the session does not exist
 */
export async function deletehealthcarePlatformSystemAdminTelemedicineSessionsTelemedicineSessionId(props: {
  systemAdmin: SystemadminPayload;
  telemedicineSessionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { systemAdmin, telemedicineSessionId } = props;

  // Step 1: Verify session exists; throw if not found
  await MyGlobal.prisma.healthcare_platform_telemedicine_sessions.findUniqueOrThrow(
    {
      where: { id: telemedicineSessionId },
    },
  );

  // Step 2: Delete the session (hard delete)
  await MyGlobal.prisma.healthcare_platform_telemedicine_sessions.delete({
    where: { id: telemedicineSessionId },
  });

  // Step 3: Write compliance audit log
  await MyGlobal.prisma.healthcare_platform_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      user_id: systemAdmin.id,
      organization_id: null,
      action_type: "TELEMEDICINE_SESSION_DELETE",
      event_context: `telemedicineSessionId: ${telemedicineSessionId}`,
      ip_address: undefined,
      related_entity_type: "telemedicine_session",
      related_entity_id: telemedicineSessionId,
      created_at: toISOStringSafe(new Date()),
    },
  });
}
