import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAppointmentWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentWaitlist";
import { ReceptionistPayload } from "../decorators/payload/ReceptionistPayload";

/**
 * Add a waitlist entry for a patient to a specific appointment (join waitlist).
 *
 * This operation creates a new waitlist entry for a patient on a given
 * appointment. Receptionists may use this to add a patient to the waitlist for
 * a full appointment. The function enforces business logic policies including:
 *
 * - Patient cannot join a waitlist for the same appointment more than once
 *   (enforced by database unique constraint).
 * - The appointment and patient must exist and be active (not deleted).
 * - The status defaults to 'active' unless otherwise specified in the body.
 * - Join_time defaults to the current server time if omitted. All creation events
 *   are subject to audit/logging as required elsewhere.
 *
 * @param props - The props for the request.
 * @param props.receptionist - The authenticated receptionist performing the
 *   action.
 * @param props.appointmentId - The appointment to join the waitlist for.
 * @param props.body - Waitlist join data including patient id, and optional
 *   join_time or status.
 * @returns The newly created waitlist entry, including all metadata fields.
 * @throws {Error} If the appointment does not exist, patient is not found or is
 *   deleted, or a duplicate waitlist entry exists.
 */
export async function posthealthcarePlatformReceptionistAppointmentsAppointmentIdWaitlists(props: {
  receptionist: ReceptionistPayload;
  appointmentId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformAppointmentWaitlist.ICreate;
}): Promise<IHealthcarePlatformAppointmentWaitlist> {
  const { receptionist, appointmentId, body } = props;

  // 1. Validate appointment existence and that it's not deleted
  const appointment =
    await MyGlobal.prisma.healthcare_platform_appointments.findFirst({
      where: { id: appointmentId, deleted_at: null },
    });
  if (!appointment) {
    throw new Error("Appointment not found or is deleted");
  }

  // 2. Validate patient existence and that it's not deleted
  const patient = await MyGlobal.prisma.healthcare_platform_patients.findFirst({
    where: { id: body.patient_id, deleted_at: null },
  });
  if (!patient) {
    throw new Error("Patient not found or is deleted");
  }

  // 3. Enforce unique waitlist: check for pre-existing entry
  const existing =
    await MyGlobal.prisma.healthcare_platform_appointment_waitlists.findFirst({
      where: { appointment_id: appointmentId, patient_id: body.patient_id },
    });
  if (existing) {
    throw new Error("This patient is already waitlisted for this appointment");
  }

  // 4. Business policy: status defaults to 'active', join_time defaults to now
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const join_time: string & tags.Format<"date-time"> =
    body.join_time !== undefined && body.join_time !== null
      ? body.join_time
      : now;
  const status: string =
    body.status !== undefined && body.status !== null ? body.status : "active";

  // 5. Insert new appointment waitlist entry
  const result =
    await MyGlobal.prisma.healthcare_platform_appointment_waitlists.create({
      data: {
        id: v4(),
        appointment_id: appointmentId,
        patient_id: body.patient_id,
        join_time,
        status,
        created_at: now,
        updated_at: now,
      },
    });

  // 6. Return correctly-typed DTO
  return {
    id: result.id,
    appointment_id: result.appointment_id,
    patient_id: result.patient_id,
    join_time: result.join_time,
    status: result.status,
    created_at: result.created_at,
    updated_at: result.updated_at,
  };
}
