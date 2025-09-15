import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAppointmentWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentWaitlist";
import { DepartmentheadPayload } from "../decorators/payload/DepartmentheadPayload";

/**
 * Get details of a specific appointment waitlist entry.
 *
 * This operation retrieves detailed information for an individual waitlist
 * entry attached to a healthcare platform appointment. It verifies that the
 * Department Head only has access if the appointment belongs to their
 * department. Returns join time, patient, status, and all audit timestamps for
 * the specified entry. Throws errors on invalid IDs or unauthorized access.
 *
 * @param props - The operation props.
 * @param props.departmentHead - DepartmentheadPayload (authenticated department
 *   head user)
 * @param props.appointmentId - Appointment id (UUID)
 * @param props.waitlistId - Waitlist entry id (UUID)
 * @returns Full waitlist entry info for given appointment and id.
 * @throws {Error} If the waitlist entry does not exist, the appointment does
 *   not exist, or if departmentHead is not allowed for this appointment (wrong
 *   department).
 */
export async function gethealthcarePlatformDepartmentHeadAppointmentsAppointmentIdWaitlistsWaitlistId(props: {
  departmentHead: DepartmentheadPayload;
  appointmentId: string & tags.Format<"uuid">;
  waitlistId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformAppointmentWaitlist> {
  const { departmentHead, appointmentId, waitlistId } = props;

  // Fetch the waitlist entry.
  const waitlist =
    await MyGlobal.prisma.healthcare_platform_appointment_waitlists.findFirst({
      where: { id: waitlistId, appointment_id: appointmentId },
    });
  if (!waitlist) throw new Error("Waitlist entry not found");

  // Fetch the appointment, select department scope.
  const appointment =
    await MyGlobal.prisma.healthcare_platform_appointments.findFirst({
      where: { id: appointmentId },
      select: { healthcare_platform_department_id: true },
    });
  if (!appointment) throw new Error("Appointment not found");

  // Enforce department-based access. This requires DepartmentheadPayload to have a department id property.
  if (
    !appointment.healthcare_platform_department_id ||
    !("departmentId" in departmentHead) ||
    appointment.healthcare_platform_department_id !==
      (departmentHead as any).departmentId
  ) {
    throw new Error(
      "Forbidden: Department head not authorized for this appointment's department",
    );
  }

  // Format all required fields for output DTO, ensuring all date fields are ISO string branded
  return {
    id: waitlist.id,
    appointment_id: waitlist.appointment_id,
    patient_id: waitlist.patient_id,
    join_time: toISOStringSafe(waitlist.join_time),
    status: waitlist.status,
    created_at: toISOStringSafe(waitlist.created_at),
    updated_at: toISOStringSafe(waitlist.updated_at),
  };
}
