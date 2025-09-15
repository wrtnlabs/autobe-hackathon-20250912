import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAppointmentWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentWaitlist";
import { MedicaldoctorPayload } from "../decorators/payload/MedicaldoctorPayload";

/**
 * Get details of a specific appointment waitlist entry.
 *
 * Retrieves detailed information for an individual waitlist entry in the
 * appointment system, including patient, join time, and current status. Allows
 * access only if the authenticated medical doctor is the provider on the
 * appointment. Every access is auditable and strict access control is enforced
 * for PHI compliance.
 *
 * @param props - Object with authenticated Medicaldoctor, appointmentId, and
 *   waitlistId
 * @param props.medicalDoctor - The authenticated doctor (MedicaldoctorPayload)
 * @param props.appointmentId - UUID of the appointment to which the waitlist
 *   entry belongs
 * @param props.waitlistId - UUID of the waitlist entry to retrieve
 * @returns Detailed waitlist entry metadata
 * @throws {Error} If there is no matching waitlist entry (404)
 * @throws {Error} If the doctor does not have access to this appointment's
 *   waitlist (403)
 */
export async function gethealthcarePlatformMedicalDoctorAppointmentsAppointmentIdWaitlistsWaitlistId(props: {
  medicalDoctor: MedicaldoctorPayload;
  appointmentId: string & tags.Format<"uuid">;
  waitlistId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformAppointmentWaitlist> {
  const { medicalDoctor, appointmentId, waitlistId } = props;

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

  const appointment =
    await MyGlobal.prisma.healthcare_platform_appointments.findFirst({
      where: { id: appointmentId },
    });
  if (!appointment) {
    throw new Error("Appointment not found");
  }
  if (appointment.provider_id !== medicalDoctor.id) {
    throw new Error(
      "Forbidden: Doctor is not the assigned provider for this appointment",
    );
  }

  return {
    id: waitlist.id,
    appointment_id: waitlist.appointment_id,
    patient_id: waitlist.patient_id,
    join_time: toISOStringSafe(waitlist.join_time),
    status: waitlist.status,
    created_at: toISOStringSafe(waitlist.created_at),
    updated_at: toISOStringSafe(waitlist.updated_at),
  };
}
