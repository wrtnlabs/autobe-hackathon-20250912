import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAppointmentWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentWaitlist";
import { MedicaldoctorPayload } from "../decorators/payload/MedicaldoctorPayload";

/**
 * Edit a specific waitlist entry for an appointment.
 *
 * This function allows an authenticated medical doctor to update mutable fields
 * of a specific waitlist entry under their purview, such as the status (e.g.,
 * from active to promoted/removed) or the join time of a patient's entry on an
 * appointment's waitlist. The operation enforces that only the provider
 * (doctor) assigned to the appointment may edit that appointment's waitlist
 * entries. Immutable fields such as patient_id, appointment_id, or id cannot be
 * altered, regardless of input. If the appointment or waitlist entry cannot be
 * found, or if the acting doctor is not the assigned provider, an explicit
 * error is thrown. All updates set the updated_at field to the current time.
 * All fields are returned in strict accordance with the DTO, with all date
 * values as ISO8601 strings and with strong typing -- native Date types are not
 * used.
 *
 * @param props - Object containing:
 *
 *   - MedicalDoctor: The authenticated medical doctor making the request (must
 *       match provider of appointment)
 *   - AppointmentId: Unique identifier for the appointment hosting the waitlist
 *       entry
 *   - WaitlistId: Unique identifier for the waitlist entry to update
 *   - Body: Fields to be updated (see
 *       IHealthcarePlatformAppointmentWaitlist.IUpdate)
 *
 * @returns The updated waitlist entry in DTO format
 * @throws {Error} If the appointment does not exist, the doctor is not the
 *   appointment provider, or the waitlist entry does not exist for this
 *   appointment
 */
export async function puthealthcarePlatformMedicalDoctorAppointmentsAppointmentIdWaitlistsWaitlistId(props: {
  medicalDoctor: MedicaldoctorPayload;
  appointmentId: string & tags.Format<"uuid">;
  waitlistId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformAppointmentWaitlist.IUpdate;
}): Promise<IHealthcarePlatformAppointmentWaitlist> {
  const { medicalDoctor, appointmentId, waitlistId, body } = props;

  // Step 1: Find appointment, check existence
  const appointment =
    await MyGlobal.prisma.healthcare_platform_appointments.findFirst({
      where: { id: appointmentId },
    });
  if (!appointment) {
    throw new Error("Appointment not found");
  }

  // Step 2: Authorize medical doctor as provider
  if (appointment.provider_id !== medicalDoctor.id) {
    throw new Error(
      "Unauthorized: Only the assigned provider may edit waitlist entries for this appointment",
    );
  }

  // Step 3: Find the waitlist entry tied to this appointment
  const waitlist =
    await MyGlobal.prisma.healthcare_platform_appointment_waitlists.findFirst({
      where: {
        id: waitlistId,
        appointment_id: appointmentId,
      },
    });
  if (!waitlist) {
    throw new Error("Waitlist entry not found for this appointment and id");
  }

  // Step 4: Prepare updated fields (only allowing status, join_time)
  const updateData: {
    status?: string;
    join_time?: (string & tags.Format<"date-time">) | null;
    updated_at: string & tags.Format<"date-time">;
  } = {
    updated_at: toISOStringSafe(new Date()),
  };
  if (body.status !== undefined) {
    updateData.status = body.status;
  }
  if (body.join_time !== undefined) {
    updateData.join_time = body.join_time;
  }

  // Step 5: Update the waitlist entry
  const updated =
    await MyGlobal.prisma.healthcare_platform_appointment_waitlists.update({
      where: { id: waitlistId },
      data: updateData,
    });

  // Step 6: Return the updated entry, preserving types (no as, no Date)
  return {
    id: updated.id,
    appointment_id: updated.appointment_id,
    patient_id: updated.patient_id,
    join_time: updated.join_time,
    status: updated.status,
    created_at: updated.created_at,
    updated_at: updated.updated_at,
  };
}
