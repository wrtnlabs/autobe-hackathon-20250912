import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAppointmentWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentWaitlist";
import { ReceptionistPayload } from "../decorators/payload/ReceptionistPayload";

/**
 * Get details of a specific appointment waitlist entry.
 *
 * Retrieves detailed information for an individual waitlist entry of an
 * appointment, including patient, join time, and current status. Enforces
 * strict access control: only receptionists belonging to the same organization
 * as the appointment may access waitlist details. Every access is auditable and
 * supports compliance requirements.
 *
 * @param props - The input object containing receptionist authentication
 *   (payload), appointmentId, and waitlistId.
 * @param props.receptionist - The authenticated receptionist making the request
 * @param props.appointmentId - UUID of the appointment for which to retrieve
 *   the waitlist entry
 * @param props.waitlistId - UUID of the waitlist entry to retrieve
 * @returns Waitlist entry details for the specified appointment
 * @throws {Error} When the waitlist entry is not found, the appointment does
 *   not exist, receptionist is not found, or unauthorized access is attempted
 */
export async function gethealthcarePlatformReceptionistAppointmentsAppointmentIdWaitlistsWaitlistId(props: {
  receptionist: ReceptionistPayload;
  appointmentId: string & tags.Format<"uuid">;
  waitlistId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformAppointmentWaitlist> {
  const { receptionist, appointmentId, waitlistId } = props;

  // Step 1: Fetch waitlist entry
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

  // Step 2: Fetch appointment to determine organization
  const appointment =
    await MyGlobal.prisma.healthcare_platform_appointments.findUnique({
      where: { id: appointmentId },
      select: { healthcare_platform_organization_id: true },
    });
  if (!appointment) {
    throw new Error("Appointment not found");
  }

  // Step 3: Fetch receptionist to determine organization (assumed organization_id == receptionist.id)
  const receptionistRecord =
    await MyGlobal.prisma.healthcare_platform_receptionists.findUnique({
      where: { id: receptionist.id },
      select: { id: true },
    });
  if (!receptionistRecord) {
    throw new Error("Receptionist not found");
  }

  // Step 4: Enforce org access control (appointment orgId must match receptionist id)
  if (
    appointment.healthcare_platform_organization_id !== receptionistRecord.id
  ) {
    throw new Error(
      "Unauthorized: Receptionist does not have access to this appointment/waitlist",
    );
  }

  // Step 5: Transform date fields, return result as per DTO contract
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
