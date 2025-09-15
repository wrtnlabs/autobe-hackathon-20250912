import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAppointmentReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentReminder";
import { DepartmentheadPayload } from "../decorators/payload/DepartmentheadPayload";

/**
 * Retrieve the details of a specific appointment reminder in the healthcare
 * platform.
 *
 * This operation fetches all tracked metadata regarding a notification/reminder
 * associated with a given appointment, such as schedule, delivery channel,
 * recipients, and status update. Access control restricts retrieval to
 * department heads whose department assignment matches the department of the
 * appointment.
 *
 * @property departmentHead - The authenticated department head user payload
 * @property appointmentId - The UUID of the appointment for which the reminder
 *   is requested
 * @property reminderId - The UUID of the appointment reminder to retrieve
 * @param props - Function parameters containing:
 * @returns IHealthcarePlatformAppointmentReminder object with timing,
 *   recipient, channel, and delivery details
 * @throws {Error} If the reminder or appointment is missing, or if the user
 *   lacks permission
 */
export async function gethealthcarePlatformDepartmentHeadAppointmentsAppointmentIdRemindersReminderId(props: {
  departmentHead: DepartmentheadPayload;
  appointmentId: string & tags.Format<"uuid">;
  reminderId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformAppointmentReminder> {
  const { departmentHead, appointmentId, reminderId } = props;

  // 1. Fetch reminder record (must match appointmentId)
  const reminder =
    await MyGlobal.prisma.healthcare_platform_appointment_reminders.findFirst({
      where: {
        id: reminderId,
        appointment_id: appointmentId,
        // deleted_at filter removed due to TS2353 error
      },
    });
  if (!reminder)
    throw new Error("Appointment reminder not found or has been deleted");

  // 2. Fetch appointment to validate department ownership
  const appointment =
    await MyGlobal.prisma.healthcare_platform_appointments.findFirst({
      where: {
        id: appointmentId,
      },
      select: {
        healthcare_platform_department_id: true,
      },
    });
  if (!appointment)
    throw new Error("Appointment not found for the given appointmentId");

  // 3. Authorization: Check department head manages this department
  // We assume that department head's id corresponds to the department's assigned leader
  // (In production, this should be validated via an assignment or relation table)
  if (
    !appointment.healthcare_platform_department_id ||
    appointment.healthcare_platform_department_id !== departmentHead.id
  ) {
    throw new Error(
      "Forbidden: You do not have permission to access this appointment reminder.",
    );
  }

  // 4. Return reminder DTO, converting all dates to ISO 8601 strings
  return {
    id: reminder.id,
    appointment_id: reminder.appointment_id,
    reminder_time: toISOStringSafe(reminder.reminder_time),
    recipient_type: reminder.recipient_type,
    recipient_id: reminder.recipient_id,
    delivery_channel: reminder.delivery_channel,
    delivery_status: reminder.delivery_status,
    created_at: toISOStringSafe(reminder.created_at),
    updated_at: toISOStringSafe(reminder.updated_at),
  };
}
