import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformEscalationEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEscalationEvent";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Get details for a specific escalation event in
 * healthcare_platform_escalation_events.
 *
 * Retrieves the details of a single escalation event by its unique identifier
 * from the escalation events registry table. This endpoint allows authenticated
 * system administrators to review the full escalation event record for
 * operational audit, compliance review, or workflow monitoring. The response
 * includes escalation type, escalation level, associated user/role, creation
 * and deadline timestamps, current resolution status, and audit link fields.
 * Only system administrators (props.systemAdmin) may access this data,
 * supporting organizational security and regulatory needs.
 *
 * @param props - Input parameters
 * @param props.systemAdmin - Authenticated system administrator
 *   (decorator-enforced)
 * @param props.escalationEventId - Unique escalation event ID to retrieve
 * @returns The escalation event record matching the provided ID
 * @throws {Error} If the escalation event does not exist
 */
export async function gethealthcarePlatformSystemAdminEscalationEventsEscalationEventId(props: {
  systemAdmin: SystemadminPayload;
  escalationEventId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformEscalationEvent> {
  const {
    escalationEventId,
    // systemAdmin: validated by decorator, role enforced
  } = props;

  const record =
    await MyGlobal.prisma.healthcare_platform_escalation_events.findUniqueOrThrow(
      {
        where: {
          id: escalationEventId,
        },
        select: {
          id: true,
          source_notification_id: true,
          target_user_id: true,
          target_role_id: true,
          escalation_type: true,
          escalation_level: true,
          deadline_at: true,
          resolution_status: true,
          resolution_time: true,
          resolution_notes: true,
          created_at: true,
        },
      },
    );
  return {
    id: record.id,
    source_notification_id:
      record.source_notification_id === null
        ? undefined
        : record.source_notification_id,
    target_user_id:
      record.target_user_id === null ? undefined : record.target_user_id,
    target_role_id:
      record.target_role_id === null ? undefined : record.target_role_id,
    escalation_type: record.escalation_type,
    escalation_level: record.escalation_level,
    deadline_at: toISOStringSafe(record.deadline_at),
    resolution_status: record.resolution_status,
    resolution_time:
      record.resolution_time === null
        ? undefined
        : toISOStringSafe(record.resolution_time),
    resolution_notes:
      record.resolution_notes === null ? undefined : record.resolution_notes,
    created_at: toISOStringSafe(record.created_at),
  };
}
