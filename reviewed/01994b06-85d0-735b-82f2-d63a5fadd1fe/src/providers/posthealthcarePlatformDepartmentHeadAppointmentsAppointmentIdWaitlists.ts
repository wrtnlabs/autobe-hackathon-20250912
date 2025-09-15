import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAppointmentWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentWaitlist";
import { DepartmentheadPayload } from "../decorators/payload/DepartmentheadPayload";

/**
 * Add a patient to an appointment waitlist as department head.
 *
 * This endpoint allows a department head user to add a patient to the waitlist
 * for a specified appointment. It enforces uniqueness (no duplicate patient on
 * the same waitlist), confirms the appointment is valid and not deleted, sets
 * audit fields, and applies policy defaults for missing join time or status.
 * All date/datetime fields are returned as ISO8601 strings.
 *
 * @param props - The request object
 * @param props.departmentHead - The authenticated department head performing
 *   the operation
 * @param props.appointmentId - The UUID of the target appointment
 * @param props.body - Data including patient_id, optional join_time, and status
 * @returns The created waitlist record with all required fields populated
 * @throws {Error} If the appointment does not exist, is deleted, or the patient
 *   is already waitlisted.
 */
export async function posthealthcarePlatformDepartmentHeadAppointmentsAppointmentIdWaitlists(props: {
  departmentHead: DepartmentheadPayload;
  appointmentId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformAppointmentWaitlist.ICreate;
}): Promise<IHealthcarePlatformAppointmentWaitlist> {
  // 1. Ensure appointment exists and is not deleted
  const appointment =
    await MyGlobal.prisma.healthcare_platform_appointments.findFirst({
      where: {
        id: props.appointmentId,
        deleted_at: null,
      },
    });
  if (appointment == null) {
    throw new Error("Appointment does not exist or has been deleted");
  }

  // 2. Prevent duplicate waitlist entries for (appointment_id, patient_id)
  const waitlistExists =
    await MyGlobal.prisma.healthcare_platform_appointment_waitlists.findFirst({
      where: {
        appointment_id: props.appointmentId,
        patient_id: props.body.patient_id,
      },
    });
  if (waitlistExists != null) {
    throw new Error("Patient is already on the waitlist for this appointment");
  }

  // 3. Set audit fields and defaults
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const joinTime: string & tags.Format<"date-time"> =
    props.body.join_time !== undefined && props.body.join_time !== null
      ? props.body.join_time
      : now;
  const status: string =
    props.body.status !== undefined && props.body.status !== null
      ? props.body.status
      : "active";
  const id: string & tags.Format<"uuid"> = v4();

  // 4. Create the waitlist entry
  const created =
    await MyGlobal.prisma.healthcare_platform_appointment_waitlists.create({
      data: {
        id,
        appointment_id: props.appointmentId,
        patient_id: props.body.patient_id,
        join_time: joinTime,
        status,
        created_at: now,
        updated_at: now,
      },
    });

  // 5. Return result (all datetime fields as ISO strings)
  return {
    id: created.id,
    appointment_id: created.appointment_id,
    patient_id: created.patient_id,
    join_time: toISOStringSafe(created.join_time),
    status: created.status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
