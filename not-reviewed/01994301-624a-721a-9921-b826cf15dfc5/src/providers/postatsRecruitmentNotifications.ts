import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentNotification";

/**
 * Create a new ats_recruitment_notifications event entry.
 *
 * This operation creates and persists a new notification record in the
 * ats_recruitment_notifications table. Any system actor (or process) can
 * trigger creation, provided at least one recipient is set. The notification is
 * created with the required event metadata; audit and compliance logging is
 * handled on creation. The notification entry is the authoritative source for
 * delivery triggers, downstream workflows, and compliance/audit purposes.
 * Returns the persisted notification entity including ID and timing details.
 *
 * Business logic: At least one recipient (applicant, HR, tech reviewer, or
 * system admin) must be present. If not, the operation is rejected. Delivery is
 * handled asynchronously downstream.
 *
 * @param props - Operation arguments
 * @param props.body - Complete notification creation data, including
 *   recipients, event type, references, context, and status
 * @returns Fully populated notification entity with UUID and timestamps as
 *   stored
 * @throws {Error} If no recipient is provided (business logic violation)
 */
export async function postatsRecruitmentNotifications(props: {
  body: IAtsRecruitmentNotification.ICreate;
}): Promise<IAtsRecruitmentNotification> {
  const { body } = props;
  // Business rule: must have at least one recipient.
  if (
    !body.recipient_applicant_id &&
    !body.recipient_hrrecruiter_id &&
    !body.recipient_techreviewer_id &&
    !body.recipient_systemadmin_id
  ) {
    throw new Error(
      "At least one recipient field (applicant, hr recruiter, tech reviewer, or system admin) must be set",
    );
  }
  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.ats_recruitment_notifications.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      recipient_applicant_id: body.recipient_applicant_id ?? undefined,
      recipient_hrrecruiter_id: body.recipient_hrrecruiter_id ?? undefined,
      recipient_techreviewer_id: body.recipient_techreviewer_id ?? undefined,
      recipient_systemadmin_id: body.recipient_systemadmin_id ?? undefined,
      event_type: body.event_type,
      reference_table: body.reference_table,
      reference_id: body.reference_id,
      payload_json: body.payload_json ?? undefined,
      status: body.status,
      created_at: now,
      updated_at: now,
      deleted_at: undefined,
    },
  });
  return {
    id: created.id,
    recipient_applicant_id: created.recipient_applicant_id ?? undefined,
    recipient_hrrecruiter_id: created.recipient_hrrecruiter_id ?? undefined,
    recipient_techreviewer_id: created.recipient_techreviewer_id ?? undefined,
    recipient_systemadmin_id: created.recipient_systemadmin_id ?? undefined,
    event_type: created.event_type,
    reference_table: created.reference_table,
    reference_id: created.reference_id,
    payload_json: created.payload_json ?? undefined,
    status: created.status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
  };
}
