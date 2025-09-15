import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAppointmentWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentWaitlist";
import { MedicaldoctorPayload } from "../decorators/payload/MedicaldoctorPayload";

/**
 * Add a waitlist entry for a patient to a specific appointment (join waitlist).
 *
 * This endpoint enables a medical doctor to add a patient to the waitlist for a
 * specified appointment. It enforces the business rule that a patient cannot
 * appear more than once in a waitlist for the same appointment. All timestamps
 * are generated as ISO8601 strings, and all values are validated against the
 * Prisma schema and DTO types.
 *
 * @param props - Object containing:
 *
 *   - MedicalDoctor: Authenticated doctor payload (used for auditing and permission
 *       context)
 *   - AppointmentId: UUID for the specified appointment
 *   - Body: Waitlist creation data with patient_id, optional join_time, and
 *       optional status
 *
 * @returns The newly created waitlist entry with all schema fields populated
 * @throws {Error} If the patient is already on the waitlist for this
 *   appointment or if business logic is violated
 */
export async function posthealthcarePlatformMedicalDoctorAppointmentsAppointmentIdWaitlists(props: {
  medicalDoctor: MedicaldoctorPayload;
  appointmentId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformAppointmentWaitlist.ICreate;
}): Promise<IHealthcarePlatformAppointmentWaitlist> {
  // Prevent duplicate waitlist entry for the same appointment and patient
  const duplicate =
    await MyGlobal.prisma.healthcare_platform_appointment_waitlists.findFirst({
      where: {
        appointment_id: props.appointmentId,
        patient_id: props.body.patient_id,
      },
    });
  if (duplicate) {
    throw new Error("Patient is already waitlisted for this appointment");
  }

  // Prepare timestamps and assign fields
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const joinTime: string & tags.Format<"date-time"> =
    props.body.join_time ?? now;
  const status: string = props.body.status ?? "active";

  const created =
    await MyGlobal.prisma.healthcare_platform_appointment_waitlists.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        appointment_id: props.appointmentId,
        patient_id: props.body.patient_id,
        join_time: joinTime,
        status: status,
        created_at: now,
        updated_at: now,
      },
    });

  // Return record with all values fully typed (no assertions, all values correct)
  return {
    id: created.id,
    appointment_id: created.appointment_id,
    patient_id: created.patient_id,
    join_time: created.join_time,
    status: created.status,
    created_at: created.created_at,
    updated_at: created.updated_at,
  };
}
