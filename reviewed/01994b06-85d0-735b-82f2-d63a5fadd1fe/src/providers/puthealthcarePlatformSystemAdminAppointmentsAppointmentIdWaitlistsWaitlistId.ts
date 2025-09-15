import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAppointmentWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentWaitlist";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Edit a specific waitlist entry for an appointment.
 *
 * This endpoint allows a system admin to update the status and/or join_time of
 * a specific appointment waitlist entry. Only status and join_time fields may
 * be amended; all other fields remain unchanged. Edits are strictly limited to
 * authorized staff roles and governed by RBAC, with all changes restricted to
 * valid targets by both appointmentId and waitlistId. If the waitlist entry is
 * not found, an error is thrown. On success, returns the updated waitlist entry
 * fully mapped to the API type.
 *
 * @param props - The operation arguments
 * @param props.systemAdmin - The authenticated system admin
 * @param props.appointmentId - ID of the appointment
 * @param props.waitlistId - ID of the waitlist entry
 * @param props.body - Update fields (status, optionally join_time)
 * @returns The updated waitlist entry
 * @throws {Error} If the waitlist entry does not exist for the given
 *   appointment and id
 */
export async function puthealthcarePlatformSystemAdminAppointmentsAppointmentIdWaitlistsWaitlistId(props: {
  systemAdmin: SystemadminPayload;
  appointmentId: string & tags.Format<"uuid">;
  waitlistId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformAppointmentWaitlist.IUpdate;
}): Promise<IHealthcarePlatformAppointmentWaitlist> {
  const { appointmentId, waitlistId, body } = props;

  // Step 1: Ensure the entry exists for the correct appointment (404 if not)
  const prev =
    await MyGlobal.prisma.healthcare_platform_appointment_waitlists.findFirst({
      where: { id: waitlistId, appointment_id: appointmentId },
    });
  if (!prev) {
    throw new Error("Waitlist entry not found");
  }

  // Step 2: Build update data by only setting provided fields. 'undefined' is skip; null for join_time is skip (as it is required in schema).
  const data: {
    status?: string;
    join_time?: string & tags.Format<"date-time">;
    updated_at: string & tags.Format<"date-time">;
  } = {
    ...(body.status !== undefined ? { status: body.status } : {}),
    ...(body.join_time !== undefined && body.join_time !== null
      ? { join_time: body.join_time }
      : {}),
    updated_at: toISOStringSafe(new Date()),
  };

  // Step 3: Update in DB
  const updated =
    await MyGlobal.prisma.healthcare_platform_appointment_waitlists.update({
      where: { id: waitlistId },
      data,
    });

  // Step 4: Map DB entity to API DTO (string, no Date)
  return {
    id: updated.id,
    appointment_id: updated.appointment_id,
    patient_id: updated.patient_id,
    join_time: toISOStringSafe(updated.join_time),
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
