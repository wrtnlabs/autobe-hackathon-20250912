import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAppointmentWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentWaitlist";
import { ReceptionistPayload } from "../decorators/payload/ReceptionistPayload";

/**
 * Edit a specific waitlist entry for an appointment.
 *
 * Allows an authenticated receptionist to update an appointment's waitlist
 * entry, specifically changing status (e.g., marking as 'promoted' or
 * 'removed') or updating the join_time. This operation strictly enforces RBAC:
 * only active receptionists can perform the update. All changes update audit
 * fields and are protected by strict appointment-waitlist scoping.
 *
 * @param props - Parameters for the waitlist entry update
 * @param props.receptionist - Authenticated receptionist payload (authorization
 *   required)
 * @param props.appointmentId - UUID of the appointment to which the waitlist
 *   entry belongs
 * @param props.waitlistId - UUID of the waitlist entry to be updated
 * @param props.body - Update payload (status/join_time as permitted)
 * @returns The updated waitlist entry, with all date fields as ISO strings and
 *   correct branding
 * @throws {Error} If the waitlist entry is not found or does not belong to the
 *   specified appointment
 */
export async function puthealthcarePlatformReceptionistAppointmentsAppointmentIdWaitlistsWaitlistId(props: {
  receptionist: ReceptionistPayload;
  appointmentId: string & tags.Format<"uuid">;
  waitlistId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformAppointmentWaitlist.IUpdate;
}): Promise<IHealthcarePlatformAppointmentWaitlist> {
  const { appointmentId, waitlistId, body } = props;

  // 1. Ensure waitlist entry exists and belongs to this appointment
  const waitlist =
    await MyGlobal.prisma.healthcare_platform_appointment_waitlists.findFirst({
      where: {
        id: waitlistId,
        appointment_id: appointmentId,
      },
    });
  if (!waitlist) {
    throw new Error("Waitlist entry not found for this appointment");
  }

  // 2. Prepare update object (only set fields that are provided)
  const now = toISOStringSafe(new Date());
  const updateFields: {
    status?: string;
    join_time?: (string & tags.Format<"date-time">) | null;
    updated_at: string & tags.Format<"date-time">;
  } = {
    updated_at: now,
  };
  if (body.status !== undefined) {
    updateFields.status = body.status;
  }
  if (body.join_time !== undefined) {
    updateFields.join_time = body.join_time;
  }

  // 3. Update waitlist entry
  const updated =
    await MyGlobal.prisma.healthcare_platform_appointment_waitlists.update({
      where: { id: waitlistId },
      data: updateFields,
    });

  // 4. Return all fields strictly conforming to DTO, with date branding
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
