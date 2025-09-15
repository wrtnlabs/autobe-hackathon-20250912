import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAppointmentWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentWaitlist";
import { NursePayload } from "../decorators/payload/NursePayload";

/**
 * Edit a specific waitlist entry for an appointment.
 *
 * Updates the status or join_time of a specific appointment waitlist entry,
 * after verifying that the authorized nurse is the assigned provider of the
 * appointment. Only nurses assigned as provider for the target appointment may
 * update waitlist entries, and only editable fields status and join_time may be
 * modified. All date-times are handled as ISO8601 strings. Unauthorized access
 * or missing records produce clear errors.
 *
 * @param props - Properties for update: nurse payload, appointmentId (UUID),
 *   waitlistId (UUID), and update partial body.
 * @param props.nurse - Authenticated nurse payload (must match appointment's
 *   provider_id).
 * @param props.appointmentId - UUID of target appointment for this waitlist.
 * @param props.waitlistId - UUID of the waitlist entry to update.
 * @param props.body - Update parameters (status and/or join_time).
 * @returns Updated IHealthcarePlatformAppointmentWaitlist entry.
 * @throws {Error} If waitlist/appointment is not found, or nurse is not
 *   provider.
 */
export async function puthealthcarePlatformNurseAppointmentsAppointmentIdWaitlistsWaitlistId(props: {
  nurse: NursePayload;
  appointmentId: string & tags.Format<"uuid">;
  waitlistId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformAppointmentWaitlist.IUpdate;
}): Promise<IHealthcarePlatformAppointmentWaitlist> {
  const { nurse, appointmentId, waitlistId, body } = props;

  // 1. Fetch the waitlist entry (by id and appointment_id)
  const waitlist =
    await MyGlobal.prisma.healthcare_platform_appointment_waitlists.findFirst({
      where: {
        id: waitlistId,
        appointment_id: appointmentId,
      },
    });
  if (!waitlist) {
    throw new Error("Waitlist entry not found");
  }

  // 2. Fetch appointment to verify provider assignment
  const appointment =
    await MyGlobal.prisma.healthcare_platform_appointments.findFirst({
      where: { id: appointmentId },
    });
  if (!appointment) {
    throw new Error("Appointment not found");
  }
  if (appointment.provider_id !== nurse.id) {
    throw new Error(
      "Unauthorized: nurse is not the assigned provider for this appointment",
    );
  }

  // 3. Update only editable fields
  const updated =
    await MyGlobal.prisma.healthcare_platform_appointment_waitlists.update({
      where: { id: waitlistId },
      data: {
        ...(body.status !== undefined && { status: body.status }),
        ...(body.join_time !== undefined && { join_time: body.join_time }),
        updated_at: toISOStringSafe(new Date()),
      },
    });

  // 4. Return result mapped as DTO with all date-times converted
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
