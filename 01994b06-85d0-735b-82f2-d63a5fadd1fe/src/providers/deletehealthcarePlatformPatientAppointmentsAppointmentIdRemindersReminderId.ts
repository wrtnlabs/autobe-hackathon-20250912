import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { PatientPayload } from "../decorators/payload/PatientPayload";

/**
 * Soft-delete an appointment reminder
 * (healthcare_platform_appointment_reminders).
 *
 * In this implementation, physical deletion is used (hard delete) because the
 * Prisma schema for 'healthcare_platform_appointment_reminders' does NOT
 * include a 'deleted_at' field.
 *
 * @param props - Properties for the delete operation
 * @param props.patient - Authenticated patient (can only delete their own
 *   reminders)
 * @param props.appointmentId - UUID of the appointment linked to the reminder
 * @param props.reminderId - UUID of the reminder to be deleted
 * @returns Void
 * @throws {Error} If the reminder does not exist, is not assigned to the
 *   patient, or has been delivered
 */
export async function deletehealthcarePlatformPatientAppointmentsAppointmentIdRemindersReminderId(props: {
  patient: PatientPayload;
  appointmentId: string & tags.Format<"uuid">;
  reminderId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { patient, appointmentId, reminderId } = props;

  const reminder =
    await MyGlobal.prisma.healthcare_platform_appointment_reminders.findFirst({
      where: {
        id: reminderId,
        appointment_id: appointmentId,
        recipient_id: patient.id,
        recipient_type: "patient",
      },
      select: {
        id: true,
        delivery_status: true,
      },
    });

  if (!reminder) {
    throw new Error(
      "Appointment reminder not found, not owned by user, or already deleted.",
    );
  }
  if (reminder.delivery_status === "delivered") {
    throw new Error(
      "Cannot delete a reminder that has already been delivered.",
    );
  }

  // Physical (hard) delete due to absence of 'deleted_at' support
  await MyGlobal.prisma.healthcare_platform_appointment_reminders.delete({
    where: { id: reminder.id },
  });
}
