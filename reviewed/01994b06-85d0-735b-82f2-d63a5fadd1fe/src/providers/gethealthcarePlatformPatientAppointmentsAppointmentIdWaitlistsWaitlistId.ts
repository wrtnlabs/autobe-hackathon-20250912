import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAppointmentWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentWaitlist";
import { PatientPayload } from "../decorators/payload/PatientPayload";

/**
 * Get details of a specific appointment waitlist entry.
 *
 * Retrieves detailed information for an individual appointment waitlist entry,
 * including join time, current status (active, promoted, removed), and relevant
 * patient metadata where authorized. Permissions are strictly enforced: a
 * patient can only access their own waitlist entry. Access is auditable and
 * supports HIPAA/data compliance.
 *
 * @param props - Object containing all necessary parameters for the operation
 * @param props.patient - Authenticated patient payload (must match patient_id
 *   of entry)
 * @param props.appointmentId - UUID of the appointment containing the waitlist
 * @param props.waitlistId - UUID of the waitlist entry to retrieve
 * @returns Full details of the specified appointment waitlist entry
 * @throws {Error} When the waitlist entry is not found, or the patient is not
 *   authorized to view this entry
 */
export async function gethealthcarePlatformPatientAppointmentsAppointmentIdWaitlistsWaitlistId(props: {
  patient: PatientPayload;
  appointmentId: string & tags.Format<"uuid">;
  waitlistId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformAppointmentWaitlist> {
  const entry =
    await MyGlobal.prisma.healthcare_platform_appointment_waitlists.findFirst({
      where: {
        id: props.waitlistId,
        appointment_id: props.appointmentId,
      },
    });
  if (!entry) {
    throw new Error("Waitlist entry not found");
  }
  if (entry.patient_id !== props.patient.id) {
    throw new Error(
      "Forbidden: Cannot access another patient's waitlist entry",
    );
  }
  return {
    id: entry.id,
    appointment_id: entry.appointment_id,
    patient_id: entry.patient_id,
    join_time: toISOStringSafe(entry.join_time),
    status: entry.status,
    created_at: toISOStringSafe(entry.created_at),
    updated_at: toISOStringSafe(entry.updated_at),
  };
}
