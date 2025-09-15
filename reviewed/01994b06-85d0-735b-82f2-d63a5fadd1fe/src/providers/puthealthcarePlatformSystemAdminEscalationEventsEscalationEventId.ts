import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformEscalationEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEscalationEvent";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Update an existing escalation event in healthcare_platform_escalation_events.
 *
 * This operation allows a system admin to update assignment, escalation
 * type/level, workflow status, deadline, and resolution fields for an
 * escalation event. It enforces correct field mapping, null/undefined behavior,
 * and conversion of all date values into branded ISO strings for API
 * consistency. Validation is performed at the business logic/service layer;
 * this provider covers atomic persistence logic with correct DTO conformance.
 *
 * @param props - Operation parameters
 * @param props.systemAdmin - Authenticated SystemadminPayload (authorization
 *   required)
 * @param props.escalationEventId - The UUID of the escalation event to update
 * @param props.body - Fields to update (partial), mapped by business DTO
 * @returns The updated escalation event record as API DTO
 * @throws {Error} When the escalation event does not exist
 */
export async function puthealthcarePlatformSystemAdminEscalationEventsEscalationEventId(props: {
  systemAdmin: SystemadminPayload;
  escalationEventId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformEscalationEvent.IUpdate;
}): Promise<IHealthcarePlatformEscalationEvent> {
  const { systemAdmin, escalationEventId, body } = props;

  // Fetch the current escalation event for existence check
  const current =
    await MyGlobal.prisma.healthcare_platform_escalation_events.findUnique({
      where: { id: escalationEventId },
    });
  if (!current) {
    throw new Error("Escalation event not found");
  }

  // Apply field updates following strict null/undefined mapping rules
  await MyGlobal.prisma.healthcare_platform_escalation_events.update({
    where: { id: escalationEventId },
    data: {
      target_user_id:
        body.target_user_id === null
          ? null
          : (body.target_user_id ?? undefined),
      target_role_id:
        body.target_role_id === null
          ? null
          : (body.target_role_id ?? undefined),
      escalation_type: body.escalation_type ?? undefined,
      escalation_level: body.escalation_level ?? undefined,
      deadline_at: body.deadline_at
        ? toISOStringSafe(body.deadline_at)
        : undefined,
      resolution_status: body.resolution_status ?? undefined,
      resolution_time:
        body.resolution_time === null
          ? null
          : body.resolution_time
            ? toISOStringSafe(body.resolution_time)
            : undefined,
      resolution_notes:
        body.resolution_notes === null
          ? null
          : (body.resolution_notes ?? undefined),
    },
  });

  // Fetch the updated event
  const updated =
    await MyGlobal.prisma.healthcare_platform_escalation_events.findUniqueOrThrow(
      {
        where: { id: escalationEventId },
      },
    );

  // Output: Convert all Date fields to branded ISO strings, enforce null/undefined DTO logic
  return {
    id: updated.id,
    source_notification_id: updated.source_notification_id ?? undefined,
    target_user_id: updated.target_user_id ?? undefined,
    target_role_id: updated.target_role_id ?? undefined,
    escalation_type: updated.escalation_type,
    escalation_level: updated.escalation_level,
    deadline_at: toISOStringSafe(updated.deadline_at),
    resolution_status: updated.resolution_status,
    resolution_time: updated.resolution_time
      ? toISOStringSafe(updated.resolution_time)
      : undefined,
    resolution_notes: updated.resolution_notes ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
  };
}
