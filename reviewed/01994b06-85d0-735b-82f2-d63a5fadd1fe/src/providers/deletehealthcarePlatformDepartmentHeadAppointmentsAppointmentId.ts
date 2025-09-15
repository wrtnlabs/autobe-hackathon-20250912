import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { DepartmentheadPayload } from "../decorators/payload/DepartmentheadPayload";

/**
 * Deletes (soft deletes) an appointment by unique identifier.
 *
 * This operation allows a department head to perform a soft delete (via setting
 * deleted_at) on an appointment in their department. It enforces strict access
 * control: only department heads for the appointment's department may delete
 * it. Integrity is ensured: deletion is forbidden if the appointment is
 * referenced in closed billing records or subject to a legal hold. Every
 * successful deletion is logged for audit/compliance. Protected or non-existent
 * records throw errors.
 *
 * @param props - DepartmentHead: The authenticated department head's payload
 *   (must match appointment's department_id) appointmentId: The UUID of the
 *   appointment to be deleted
 * @returns Void
 * @throws {Error} If appointment does not exist, is already deleted,
 *   departmentHead lacks permission, or there are closed/protected references
 */
export async function deletehealthcarePlatformDepartmentHeadAppointmentsAppointmentId(props: {
  departmentHead: DepartmentheadPayload;
  appointmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { departmentHead, appointmentId } = props;

  // 1. Fetch appointment (ensure not already deleted)
  const appointment =
    await MyGlobal.prisma.healthcare_platform_appointments.findFirst({
      where: { id: appointmentId, deleted_at: null },
    });
  if (!appointment) {
    throw new Error("Appointment not found or already deleted");
  }

  // 2. Authorization: Only department head for this department may delete
  if (appointment.healthcare_platform_department_id !== departmentHead.id) {
    throw new Error(
      "Forbidden: Not department head of this department for this appointment",
    );
  }

  // 3. Prevent delete if appointment is referenced by protected billing (status in ['paid','overdue','cancelled'])
  const protectedBilling =
    await MyGlobal.prisma.healthcare_platform_billing_invoices.findFirst({
      where: {
        encounter_id: appointment.id,
        status: { in: ["paid", "overdue", "cancelled"] },
        deleted_at: null,
      },
    });
  if (protectedBilling) {
    throw new Error(
      "Cannot delete appointment involved in closed/protected billing",
    );
  }

  // 4. Prevent delete if under un-released legal hold
  const legalHold =
    await MyGlobal.prisma.healthcare_platform_legal_holds.findFirst({
      where: {
        subject_id: appointment.id,
        subject_type: "appointment",
        status: { not: "released" },
        deleted_at: null,
      },
    });
  if (legalHold) {
    throw new Error("Cannot delete appointment under legal hold");
  }

  // 5. Perform soft delete
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.healthcare_platform_appointments.update({
    where: { id: appointment.id },
    data: { deleted_at: now },
  });

  // 6. Log deletion event (audit log)
  await MyGlobal.prisma.healthcare_platform_audit_logs.create({
    data: {
      id: v4(),
      user_id: departmentHead.id,
      organization_id: null,
      action_type: "DELETE_APPOINTMENT",
      related_entity_type: "appointment",
      related_entity_id: appointment.id,
      created_at: now,
    },
  });
}
