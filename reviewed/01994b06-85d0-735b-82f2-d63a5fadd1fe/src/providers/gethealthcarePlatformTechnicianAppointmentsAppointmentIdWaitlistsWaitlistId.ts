import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAppointmentWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentWaitlist";
import { TechnicianPayload } from "../decorators/payload/TechnicianPayload";

/**
 * Get details of a specific appointment waitlist entry.
 *
 * Retrieves detailed information about a specific waitlist entry in the
 * healthcare platform appointment system, including patient reference, join
 * time, current status, and audit timestamps. The endpoint is accessible to
 * technicians only if the authenticated technician is assigned as the provider
 * for the appointment. Unauthorized access is forbidden; non-existent entries
 * throw a not found error.
 *
 * @param props - Contains the authenticated technician payload, appointmentId,
 *   and waitlistId path parameters.
 * @param props.technician - Authentication payload for the technician
 *   (requesting user).
 * @param props.appointmentId - UUID of the appointment for which to retrieve
 *   waitlist details.
 * @param props.waitlistId - UUID of the waitlist entry to retrieve.
 * @returns IHealthcarePlatformAppointmentWaitlist with detailed information for
 *   the specified entry.
 * @throws {Error} If the waitlist entry does not exist for the appointment.
 * @throws {Error} If the technician is not authorized to access the waitlist
 *   entry.
 */
export async function gethealthcarePlatformTechnicianAppointmentsAppointmentIdWaitlistsWaitlistId(props: {
  technician: TechnicianPayload;
  appointmentId: string & tags.Format<"uuid">;
  waitlistId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformAppointmentWaitlist> {
  const { technician, appointmentId, waitlistId } = props;

  // Fetch the waitlist entry for the specific appointment and waitlist id
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

  // Fetch the appointment to ensure technician is assigned as provider
  const appointment =
    await MyGlobal.prisma.healthcare_platform_appointments.findUnique({
      where: { id: appointmentId },
      select: { provider_id: true },
    });
  if (!appointment || appointment.provider_id !== technician.id) {
    throw new Error("Forbidden");
  }

  // Map database fields to DTO, converting dates to ISO8601 strings
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
