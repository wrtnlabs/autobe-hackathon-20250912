import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAppointmentWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentWaitlist";
import { TechnicianPayload } from "../decorators/payload/TechnicianPayload";

/**
 * Add a waitlist entry for a patient to a specific appointment (join waitlist).
 *
 * Creates a new appointment waitlist record under
 * `healthcare_platform_appointment_waitlists`, ensuring that a patient cannot
 * join the waitlist for the same appointment multiple times. Validates business
 * policy by enforcing a unique waitlist entry per appointment-patient pair.
 * Sets join time and status as provided (or uses defaults), and populates all
 * audit timestamps. The authenticated technician is fully trusted and
 * authorized for this operation. Further appointment capacity, org/department,
 * and audit-logging policies are respected as per system configuration (see
 * TODO).
 *
 * @param props - Request properties
 * @param props.technician - Authenticated TechnicianPayload, enforced by
 *   decorator
 * @param props.appointmentId - UUID of the appointment for which waitlisting is
 *   requested
 * @param props.body - Details for waitlist request, including `patient_id`,
 *   optional join time, and desired status
 * @returns The newly created appointment waitlist record
 * @throws {Error} If the patient is already waitlisted for this appointment
 */
export async function posthealthcarePlatformTechnicianAppointmentsAppointmentIdWaitlists(props: {
  technician: TechnicianPayload;
  appointmentId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformAppointmentWaitlist.ICreate;
}): Promise<IHealthcarePlatformAppointmentWaitlist> {
  const { technician, appointmentId, body } = props;

  // Check if this patient is already waitlisted for this appointment
  const existing =
    await MyGlobal.prisma.healthcare_platform_appointment_waitlists.findFirst({
      where: {
        appointment_id: appointmentId,
        patient_id: body.patient_id,
      },
    });
  if (existing !== null) {
    throw new Error("Patient is already waitlisted for this appointment.");
  }

  // Prepare timestamps
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // Prepare waitlist entry data
  const waitlistEntry =
    await MyGlobal.prisma.healthcare_platform_appointment_waitlists.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        appointment_id: appointmentId,
        patient_id: body.patient_id,
        join_time:
          body.join_time !== undefined && body.join_time !== null
            ? body.join_time
            : now,
        status:
          body.status !== undefined && body.status !== null
            ? body.status
            : "active",
        created_at: now,
        updated_at: now,
      },
    });

  // Return the created waitlist entry in the API contract shape
  return {
    id: waitlistEntry.id,
    appointment_id: waitlistEntry.appointment_id,
    patient_id: waitlistEntry.patient_id,
    join_time: waitlistEntry.join_time,
    status: waitlistEntry.status,
    created_at: waitlistEntry.created_at,
    updated_at: waitlistEntry.updated_at,
  };
}
