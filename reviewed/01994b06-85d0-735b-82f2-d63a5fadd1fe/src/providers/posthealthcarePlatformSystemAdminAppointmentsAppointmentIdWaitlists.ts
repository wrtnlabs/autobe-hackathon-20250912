import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAppointmentWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentWaitlist";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Add a waitlist entry for a patient to a specific appointment (join waitlist).
 *
 * This endpoint creates a new waitlist entry for a patient on a given
 * appointment, ensuring that no duplicate entries exist for (appointment,
 * patient), and that both referenced entities exist. The join time and status
 * are set as provided or defaulted as per business requirements. All audit,
 * compliance, and data integrity rules are enforced as per organizational
 * policy. Only system administrators and authorized staff may add patients to a
 * waitlist through this API.
 *
 * @param props - Object containing authorization payload, appointmentId, body
 * @param props.systemAdmin - The authenticated system admin making the request
 * @param props.appointmentId - The unique identifier of the appointment
 * @param props.body - Body containing appointment_id (repeated for API
 *   compliance), patient_id, optional join_time and status
 * @returns The newly created waitlist record with finalized join time and
 *   status
 * @throws {Error} If appointment or patient does not exist, or if patient is
 *   already on waitlist
 */
export async function posthealthcarePlatformSystemAdminAppointmentsAppointmentIdWaitlists(props: {
  systemAdmin: SystemadminPayload;
  appointmentId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformAppointmentWaitlist.ICreate;
}): Promise<IHealthcarePlatformAppointmentWaitlist> {
  // Validate appointment exists
  await MyGlobal.prisma.healthcare_platform_appointments.findFirstOrThrow({
    where: { id: props.appointmentId },
  });
  // Validate patient exists
  await MyGlobal.prisma.healthcare_platform_patients.findFirstOrThrow({
    where: { id: props.body.patient_id },
  });
  // Uniqueness: one waitlist per (appointment, patient)
  const duplicate =
    await MyGlobal.prisma.healthcare_platform_appointment_waitlists.findFirst({
      where: {
        appointment_id: props.appointmentId,
        patient_id: props.body.patient_id,
      },
    });
  if (duplicate) {
    throw new Error(
      "Waitlist entry already exists for this appointment and patient",
    );
  }
  // Assign all required fields
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const joinTime: string & tags.Format<"date-time"> = props.body.join_time
    ? toISOStringSafe(props.body.join_time)
    : now;
  const status: string = props.body.status ?? "active";
  // Compose data for insertion
  const created =
    await MyGlobal.prisma.healthcare_platform_appointment_waitlists.create({
      data: {
        id: v4(),
        appointment_id: props.appointmentId,
        patient_id: props.body.patient_id,
        join_time: joinTime,
        status: status,
        created_at: now,
        updated_at: now,
      },
    });
  // Return strictly conforming DTO
  const result: IHealthcarePlatformAppointmentWaitlist = {
    id: created.id,
    appointment_id: created.appointment_id,
    patient_id: created.patient_id,
    join_time: toISOStringSafe(created.join_time),
    status: created.status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
  return result;
}
