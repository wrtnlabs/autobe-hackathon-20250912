import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAppointmentWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentWaitlist";
import { TechnicianPayload } from "../decorators/payload/TechnicianPayload";

/**
 * Edit a specific waitlist entry for an appointment.
 *
 * This endpoint enables an authorized medical technician to update the status
 * or join_time of a patient's appointment waitlist entry. Edits are subject to
 * access control and compliance policy; finalized/removed entries cannot be
 * updated. All returned dates are in branded ISO 8601 format.
 *
 * Only status and join_time can be changed through this operation, as other
 * fields are invariant per design. The function enforces that only the
 * specified waitlist entry for the correct appointment is modified.
 *
 * @param props - Object containing technician authentication, path parameters,
 *   and update fields
 * @param props.technician - The authenticated technician making the request
 *   (authorization required)
 * @param props.appointmentId - The appointment UUID whose waitlist entry is
 *   being edited
 * @param props.waitlistId - The waitlist entry UUID to be updated
 * @param props.body - The fields to update (status, join_time)
 * @returns The updated waitlist entry object, with all date fields as branded
 *   ISO strings
 * @throws {Error} If the entry is not found, not updatable, or authorization
 *   fails
 */
export async function puthealthcarePlatformTechnicianAppointmentsAppointmentIdWaitlistsWaitlistId(props: {
  technician: TechnicianPayload;
  appointmentId: string & tags.Format<"uuid">;
  waitlistId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformAppointmentWaitlist.IUpdate;
}): Promise<IHealthcarePlatformAppointmentWaitlist> {
  const { technician, appointmentId, waitlistId, body } = props;

  // Find the target waitlist entry by both id and appointment
  const entry =
    await MyGlobal.prisma.healthcare_platform_appointment_waitlists.findFirst({
      where: {
        id: waitlistId,
        appointment_id: appointmentId,
      },
    });

  if (!entry)
    throw new Error("Waitlist entry not found for the specified appointment");

  // Disallow update on removed/finalized entries
  if (entry.status === "removed" || entry.status === "finalized") {
    throw new Error("Cannot update a finalized or removed waitlist entry");
  }

  // Only update the fields actually provided
  const updated =
    await MyGlobal.prisma.healthcare_platform_appointment_waitlists.update({
      where: {
        id: waitlistId,
      },
      data: {
        status: body.status !== undefined ? body.status : undefined,
        // Only update join_time if provided and not null
        ...(body.join_time !== undefined &&
          body.join_time !== null && {
            join_time: body.join_time,
          }),
      },
    });

  // Map all Date fields to branded date-time strings
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
