import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformEscalationEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEscalationEvent";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Create a new escalation event record in
 * healthcare_platform_escalation_events.
 *
 * This operation enables authorized system administrators to log a new
 * escalation event, such as for actionable alerts, SLA violations, compliance
 * workflows, or regulatory notifications. It validates referential integrity
 * (notification, user, role entities), enforces all business and compliance
 * rules, assigns the system-generated UUID and creation timestamp, and returns
 * the resulting escalation event record in structured DTO format. This is a
 * critical operation for compliance/audit.
 *
 * @param props - SystemAdmin: The authenticated system administrator creating
 *   the escalation event body: Request body with escalation creation fields
 *   (see IHealthcarePlatformEscalationEvent.ICreate)
 * @returns The newly created escalation event record (see
 *   IHealthcarePlatformEscalationEvent)
 * @throws {Error} If source notification does not exist, or referenced
 *   user/role do not exist
 */
export async function posthealthcarePlatformSystemAdminEscalationEvents(props: {
  systemAdmin: SystemadminPayload;
  body: IHealthcarePlatformEscalationEvent.ICreate;
}): Promise<IHealthcarePlatformEscalationEvent> {
  const { systemAdmin, body } = props;

  // Validate source notification exists
  const notification =
    await MyGlobal.prisma.healthcare_platform_notifications.findFirst({
      where: { id: body.source_notification_id },
    });
  if (!notification) {
    throw new Error("Source notification does not exist");
  }

  // Validate target user exists if provided
  if (body.target_user_id !== undefined && body.target_user_id !== null) {
    const targetUser =
      await MyGlobal.prisma.healthcare_platform_patients.findFirst({
        where: { id: body.target_user_id },
      });
    if (!targetUser) {
      throw new Error("Target user does not exist");
    }
  }

  // Validate target role exists if provided
  if (body.target_role_id !== undefined && body.target_role_id !== null) {
    const targetRole =
      await MyGlobal.prisma.healthcare_platform_roles.findFirst({
        where: { id: body.target_role_id },
      });
    if (!targetRole) {
      throw new Error("Target role does not exist");
    }
  }

  // Generate unique UUID for id
  const id = v4();
  // Use current timestamp string for created_at
  const created_at = toISOStringSafe(new Date());

  const created =
    await MyGlobal.prisma.healthcare_platform_escalation_events.create({
      data: {
        id: id,
        source_notification_id: body.source_notification_id,
        target_user_id:
          body.target_user_id !== undefined && body.target_user_id !== null
            ? body.target_user_id
            : null,
        target_role_id:
          body.target_role_id !== undefined && body.target_role_id !== null
            ? body.target_role_id
            : null,
        escalation_type: body.escalation_type,
        escalation_level: body.escalation_level,
        deadline_at: body.deadline_at,
        resolution_status: body.resolution_status,
        resolution_time:
          body.resolution_time !== undefined && body.resolution_time !== null
            ? body.resolution_time
            : null,
        resolution_notes:
          body.resolution_notes !== undefined && body.resolution_notes !== null
            ? body.resolution_notes
            : null,
        created_at: created_at,
      },
    });

  return {
    id: created.id,
    source_notification_id: created.source_notification_id,
    target_user_id: created.target_user_id ?? undefined,
    target_role_id: created.target_role_id ?? undefined,
    escalation_type: created.escalation_type,
    escalation_level: created.escalation_level,
    deadline_at: created.deadline_at,
    resolution_status: created.resolution_status,
    resolution_time: created.resolution_time ?? undefined,
    resolution_notes: created.resolution_notes ?? undefined,
    created_at: created.created_at,
  };
}
