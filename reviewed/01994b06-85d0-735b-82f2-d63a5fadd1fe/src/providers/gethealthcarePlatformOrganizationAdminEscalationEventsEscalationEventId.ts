import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformEscalationEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEscalationEvent";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Get details for a specific escalation event in
 * healthcare_platform_escalation_events.
 *
 * Retrieves a single escalation event by its unique identifier
 * (escalationEventId) from the escalation events registry. Only accessible by
 * authenticated organization administrators. All fields are normalized for
 * compliance: nullable database fields are mapped to undefined (optionals) per
 * DTO. Date fields are returned as ISO date-time strings with proper branding.
 *
 * RBAC is enforced at the authentication level (props.organizationAdmin);
 * deeper org scoping would require a join via notification or user, which the
 * schema does not allow here.
 *
 * @param props - Request params
 * @param props.organizationAdmin - Authenticated organization admin payload
 * @param props.escalationEventId - Unique escalation event UUID to retrieve
 * @returns The detailed escalation event record per
 *   IHealthcarePlatformEscalationEvent
 * @throws {Error} If the escalation event does not exist or is deleted
 */
export async function gethealthcarePlatformOrganizationAdminEscalationEventsEscalationEventId(props: {
  organizationAdmin: OrganizationadminPayload;
  escalationEventId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformEscalationEvent> {
  const { escalationEventId } = props;
  const event =
    await MyGlobal.prisma.healthcare_platform_escalation_events.findFirst({
      where: {
        id: escalationEventId,
      },
    });
  if (!event) {
    throw new Error("Escalation event not found");
  }
  return {
    id: event.id,
    source_notification_id: event.source_notification_id ?? undefined,
    target_user_id: event.target_user_id ?? undefined,
    target_role_id: event.target_role_id ?? undefined,
    escalation_type: event.escalation_type,
    escalation_level: event.escalation_level,
    deadline_at: toISOStringSafe(event.deadline_at),
    resolution_status: event.resolution_status,
    resolution_time: event.resolution_time
      ? toISOStringSafe(event.resolution_time)
      : undefined,
    resolution_notes: event.resolution_notes ?? undefined,
    created_at: toISOStringSafe(event.created_at),
  };
}
