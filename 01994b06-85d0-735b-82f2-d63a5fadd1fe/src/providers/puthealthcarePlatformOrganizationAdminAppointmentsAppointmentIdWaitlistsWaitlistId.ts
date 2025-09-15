import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAppointmentWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentWaitlist";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Edit a specific waitlist entry for an appointment.
 *
 * This operation allows an organization admin to edit a specific patient's
 * entry on an appointment's waitlist, updating fields such as status or
 * join_time. Only the status and join_time fields may be changed. The function
 * ensures only authorized staff can edit, that the waitlist entry exists, and
 * that all date fields are returned in the correct ISO format.
 *
 * @param props - OrganizationAdmin: Authenticated organization admin user
 *   (required for authorization) appointmentId: ID of the target appointment
 *   waitlistId: ID of the waitlist entry to update body: Object containing
 *   fields to update (status, join_time)
 * @returns The updated waitlist entry with all date fields as ISO8601 strings
 * @throws {Error} If the waitlist entry is not found, or if update constraints
 *   are violated
 */
export async function puthealthcarePlatformOrganizationAdminAppointmentsAppointmentIdWaitlistsWaitlistId(props: {
  organizationAdmin: OrganizationadminPayload;
  appointmentId: string & tags.Format<"uuid">;
  waitlistId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformAppointmentWaitlist.IUpdate;
}): Promise<IHealthcarePlatformAppointmentWaitlist> {
  const { appointmentId, waitlistId, body } = props;

  // Find existing waitlist entry
  const waitlist =
    await MyGlobal.prisma.healthcare_platform_appointment_waitlists.findFirst({
      where: {
        id: waitlistId,
        appointment_id: appointmentId,
      },
    });
  if (!waitlist) {
    throw new Error("Appointment waitlist entry not found");
  }

  // Compose update object directly (never use intermediate Record<string, unknown>)
  const now = toISOStringSafe(new Date());
  const nextUpdate = {
    ...(body.status !== undefined && { status: body.status }),
    ...(body.join_time !== undefined &&
      body.join_time !== null && {
        join_time: toISOStringSafe(body.join_time),
      }),
    updated_at: now,
  };
  // If no fields to update, throw
  if (Object.keys(nextUpdate).length <= 1) {
    throw new Error("No valid fields provided for update");
  }

  const updated =
    await MyGlobal.prisma.healthcare_platform_appointment_waitlists.update({
      where: { id: waitlistId },
      data: nextUpdate,
    });

  // Compose DTO response converting all dates using toISOStringSafe
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
