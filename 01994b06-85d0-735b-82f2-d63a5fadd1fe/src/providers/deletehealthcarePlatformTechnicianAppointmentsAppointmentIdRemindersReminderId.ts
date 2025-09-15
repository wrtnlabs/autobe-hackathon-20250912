import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { TechnicianPayload } from "../decorators/payload/TechnicianPayload";

/**
 * Soft-delete an appointment reminder
 * (healthcare_platform_appointment_reminders).
 *
 * This operation marks a reminder as deleted (soft-deletes) by removing it from
 * active queries. Only the assigned technician can perform the removal, and
 * reminders that are already delivered cannot be deleted again.
 *
 * @param props - Technician authentication and appointment/reminder IDs
 * @throws {Error} If not found, already deleted, already delivered, or not
 *   authorized
 */
export async function deletehealthcarePlatformTechnicianAppointmentsAppointmentIdRemindersReminderId(props: {
  technician: TechnicianPayload;
  appointmentId: string & tags.Format<"uuid">;
  reminderId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Fetch reminder by id and appointment (select delivery_status for status check)
  const reminder =
    await MyGlobal.prisma.healthcare_platform_appointment_reminders.findFirst({
      where: {
        id: props.reminderId,
        appointment_id: props.appointmentId,
      },
      select: { delivery_status: true },
    });
  if (!reminder) throw new Error("Reminder not found or already deleted");
  if (
    reminder.delivery_status === "delivered" ||
    reminder.delivery_status === "archived"
  )
    throw new Error("Cannot delete delivered or archived reminder");

  // Fetch appointment (for authz)
  const appointment =
    await MyGlobal.prisma.healthcare_platform_appointments.findFirst({
      where: {
        id: props.appointmentId,
      },
      select: { provider_id: true },
    });
  if (!appointment) throw new Error("Appointment not found");
  if (appointment.provider_id !== props.technician.id) {
    throw new Error(
      "Permission denied: Technician is not assigned to this appointment",
    );
  }
  // Remove the reminder (hard delete as deleted_at is not available)
  await MyGlobal.prisma.healthcare_platform_appointment_reminders.delete({
    where: {
      id: props.reminderId,
    },
  });
}
