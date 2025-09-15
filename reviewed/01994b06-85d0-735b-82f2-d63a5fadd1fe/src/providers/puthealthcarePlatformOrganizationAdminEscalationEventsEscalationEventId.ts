import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformEscalationEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEscalationEvent";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Update an existing escalation event in healthcare_platform_escalation_events.
 *
 * This operation allows an organization administrator to update selected fields
 * (assignment, meta, status, notes, deadlines) on an escalation event record.
 * It enforces business rules for closure, assignment exclusivity, and workflow
 * compliance, converts all datetime fields to ISO string, and returns the
 * updated escalation event.
 *
 * Only mutable fields are modifiable; events already resolved or dismissed
 * cannot be changed. Assignment to both user and role is prevented.
 *
 * @param props - Parameter object containing organizationAdmin (authenticated
 *   payload), escalationEventId (escalation event UUID), and body (fields to
 *   update)
 * @returns The updated IHealthcarePlatformEscalationEvent object with fields
 *   compliant to DTO structure, after all business logic and type
 *   normalization.
 * @throws Error if event not found, is already closed, or assignment rules are
 *   violated.
 */
export async function puthealthcarePlatformOrganizationAdminEscalationEventsEscalationEventId(props: {
  organizationAdmin: OrganizationadminPayload;
  escalationEventId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformEscalationEvent.IUpdate;
}): Promise<IHealthcarePlatformEscalationEvent> {
  const { escalationEventId, body } = props;

  // 1. Retrieve the existing escalation event
  const existing =
    await MyGlobal.prisma.healthcare_platform_escalation_events.findUnique({
      where: { id: escalationEventId },
    });
  if (!existing) {
    throw new Error("Escalation event not found");
  }

  // 2. Disallow update if event is already resolved or dismissed
  if (
    existing.resolution_status === "resolved" ||
    existing.resolution_status === "dismissed"
  ) {
    throw new Error("Cannot update escalation event that is already closed");
  }

  // 3. Mutually exclusive: cannot assign both user and role
  const hasUser =
    body.target_user_id !== undefined && body.target_user_id !== null;
  const hasRole =
    body.target_role_id !== undefined && body.target_role_id !== null;
  if (hasUser && hasRole) {
    throw new Error(
      "Cannot assign both target_user_id and target_role_id at the same time",
    );
  }

  // 4. Prepare update params (only apply fields provided in body)
  const updateData: {
    target_user_id?: string | null;
    target_role_id?: string | null;
    escalation_type?: string;
    escalation_level?: string;
    deadline_at?: string;
    resolution_status?: string;
    resolution_time?: string | null;
    resolution_notes?: string | null;
  } = {};

  // For nullable fields, allow explicit null; for optional fields, assign if provided
  if ("target_user_id" in body)
    updateData.target_user_id =
      body.target_user_id === undefined ? undefined : body.target_user_id;
  if ("target_role_id" in body)
    updateData.target_role_id =
      body.target_role_id === undefined ? undefined : body.target_role_id;
  if ("escalation_type" in body && body.escalation_type !== undefined)
    updateData.escalation_type = body.escalation_type;
  if ("escalation_level" in body && body.escalation_level !== undefined)
    updateData.escalation_level = body.escalation_level;
  if ("deadline_at" in body && body.deadline_at !== undefined)
    updateData.deadline_at = body.deadline_at;
  if ("resolution_status" in body && body.resolution_status !== undefined)
    updateData.resolution_status = body.resolution_status;
  if ("resolution_time" in body)
    updateData.resolution_time =
      body.resolution_time === undefined ? undefined : body.resolution_time;
  if ("resolution_notes" in body)
    updateData.resolution_notes =
      body.resolution_notes === undefined ? undefined : body.resolution_notes;

  // 5. Apply the update
  const updated =
    await MyGlobal.prisma.healthcare_platform_escalation_events.update({
      where: { id: escalationEventId },
      data: {
        ...(updateData.target_user_id !== undefined && {
          target_user_id: updateData.target_user_id,
        }),
        ...(updateData.target_role_id !== undefined && {
          target_role_id: updateData.target_role_id,
        }),
        ...(updateData.escalation_type !== undefined && {
          escalation_type: updateData.escalation_type,
        }),
        ...(updateData.escalation_level !== undefined && {
          escalation_level: updateData.escalation_level,
        }),
        ...(updateData.deadline_at !== undefined && {
          deadline_at:
            typeof updateData.deadline_at === "string"
              ? toISOStringSafe(updateData.deadline_at)
              : undefined,
        }),
        ...(updateData.resolution_status !== undefined && {
          resolution_status: updateData.resolution_status,
        }),
        ...(updateData.resolution_time !== undefined && {
          resolution_time:
            updateData.resolution_time === null
              ? null
              : toISOStringSafe(updateData.resolution_time),
        }),
        ...(updateData.resolution_notes !== undefined && {
          resolution_notes: updateData.resolution_notes,
        }),
      },
    });

  // 6. Build and return DTO type
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
