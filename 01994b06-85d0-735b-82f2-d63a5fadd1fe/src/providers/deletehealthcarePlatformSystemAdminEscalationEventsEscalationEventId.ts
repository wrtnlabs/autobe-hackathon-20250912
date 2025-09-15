import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Delete a healthcarePlatform escalation event (system admin only, hard delete)
 *
 * Permanently removes an escalation event from the system using its unique
 * identifier. This operation is restricted to system administrators, as
 * escalation events are part of compliance and incident workflows. The event is
 * irreversibly deleted; auditability is preserved through external logs and
 * subsystem tracking per system policy.
 *
 * Authorization is strictly enforced by requiring the SystemadminPayload input.
 * Any attempt to delete a non-existent event or without sufficient privilege
 * will result in an error.
 *
 * @param props - Operation parameters object
 * @param props.systemAdmin - The authenticated system administrator performing
 *   this action
 * @param props.escalationEventId - The UUID of the escalation event to delete
 * @returns Void
 * @throws {Error} If the escalation event does not exist or deletion is not
 *   permitted
 */
export async function deletehealthcarePlatformSystemAdminEscalationEventsEscalationEventId(props: {
  systemAdmin: SystemadminPayload;
  escalationEventId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify the escalation event exists (throws if not found)
  await MyGlobal.prisma.healthcare_platform_escalation_events.findUniqueOrThrow(
    {
      where: { id: props.escalationEventId },
    },
  );

  // Perform irreversible, hard delete
  await MyGlobal.prisma.healthcare_platform_escalation_events.delete({
    where: { id: props.escalationEventId },
  });
}
