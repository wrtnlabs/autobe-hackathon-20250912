import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAppointmentWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentWaitlist";
import { DepartmentheadPayload } from "../decorators/payload/DepartmentheadPayload";

/**
 * Edit a specific waitlist entry for an appointment.
 *
 * Updates an existing waitlist entry's fields such as status (e.g.,
 * promote/remove) or join time, provided the requesting user is an authorized
 * department head for the relevant department. Returns the updated waitlist
 * entry.
 *
 * - Validates existence of specified waitlist and appointment IDs
 * - Enforces that only the department head for the appointment's department may
 *   update the waitlist entry
 * - Only permits updating status and/or join_time, and always updates updated_at
 * - Returns the updated entry in correct DTO shape, with string ISO timestamps
 * - No usage of native Date or type assertions
 *
 * @param props - Request parameters
 * @param props.departmentHead - The authenticated department head
 *   (DepartmentheadPayload)
 * @param props.appointmentId - UUID of the appointment whose waitlist entry to
 *   update
 * @param props.waitlistId - UUID of the waitlist entry to update
 * @param props.body - Update payload ({ status, join_time })
 * @returns The updated waitlist entry
 * @throws {Error} If the waitlist entry or appointment is not found or the user
 *   is unauthorized
 */
export async function puthealthcarePlatformDepartmentHeadAppointmentsAppointmentIdWaitlistsWaitlistId(props: {
  departmentHead: DepartmentheadPayload;
  appointmentId: string & tags.Format<"uuid">;
  waitlistId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformAppointmentWaitlist.IUpdate;
}): Promise<IHealthcarePlatformAppointmentWaitlist> {
  const { departmentHead, appointmentId, waitlistId, body } = props;

  // Step 1: Fetch the waitlist entry
  const waitlist =
    await MyGlobal.prisma.healthcare_platform_appointment_waitlists.findFirst({
      where: {
        id: waitlistId,
        appointment_id: appointmentId,
      },
    });
  if (!waitlist) throw new Error("Waitlist entry not found");

  // Step 2: Fetch appointment and enforce department head privilege
  const appointment =
    await MyGlobal.prisma.healthcare_platform_appointments.findUnique({
      where: { id: appointmentId },
      select: { healthcare_platform_department_id: true },
    });
  if (!appointment) throw new Error("Appointment not found");
  if (
    !appointment.healthcare_platform_department_id ||
    appointment.healthcare_platform_department_id !==
      departmentHead.department_id
  ) {
    throw new Error(
      "Forbidden: Only department head of this department can update waitlist entry",
    );
  }

  // Step 3: Prepare update data
  const now = toISOStringSafe(new Date());
  const updateData: Partial<IHealthcarePlatformAppointmentWaitlist.IUpdate> & {
    updated_at: string & tags.Format<"date-time">;
  } = {
    updated_at: now,
  };
  if (body.status !== undefined) updateData.status = body.status;
  if (body.join_time !== undefined) updateData.join_time = body.join_time;

  // Step 4: Update
  const updated =
    await MyGlobal.prisma.healthcare_platform_appointment_waitlists.update({
      where: { id: waitlistId },
      data: updateData,
    });

  // Step 5: Map to DTO and return
  return {
    id: updated.id,
    appointment_id: updated.appointment_id,
    patient_id: updated.patient_id,
    join_time: toISOStringSafe(updated.join_time),
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
