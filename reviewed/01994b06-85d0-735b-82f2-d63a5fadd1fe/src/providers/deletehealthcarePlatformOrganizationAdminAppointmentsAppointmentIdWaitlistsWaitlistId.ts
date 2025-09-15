import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Erase a patient waitlist entry from a specific appointment (hard delete,
 * Scheduling)
 *
 * This API operation deletes a patient waitlist entry permanently from the
 * healthcarePlatform's Scheduling system, targeting the
 * `healthcare_platform_appointment_waitlists` table for the combination of
 * appointmentId and waitlistId. It is intended for administrative users
 * (organization admin) to fully erase a waitlist entry when a patient is no
 * longer awaiting an appointment slot.
 *
 * Authorization: Only authenticated organizationAdmin users may execute this
 * operation. The function will throw an error if the waitlistId does not exist
 * or does not correspond to the specified appointmentId, ensuring data
 * integrity and compliance. This operation is fully auditable as part of
 * platform workflows. Deletion is permanent; there is no soft delete marker for
 * this table.
 *
 * @param props - Input object containing the following:
 * @param props.organizationAdmin - The authenticated organization admin
 *   performing the deletion
 * @param props.appointmentId - The uuid of the appointment for which the
 *   waitlist entry should be deleted
 * @param props.waitlistId - The uuid of the waitlist entry to be erased
 * @returns Void
 * @throws {Error} If no such waitlist entry exists or entry is not associated
 *   with the supplied appointmentId
 */
export async function deletehealthcarePlatformOrganizationAdminAppointmentsAppointmentIdWaitlistsWaitlistId(props: {
  organizationAdmin: OrganizationadminPayload;
  appointmentId: string & tags.Format<"uuid">;
  waitlistId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Destructure explicit props for clarity and enforcement of contract
  const { organizationAdmin, appointmentId, waitlistId } = props;

  // First, ensure the specified waitlist entry exists and belongs to that appointment
  const waitlist =
    await MyGlobal.prisma.healthcare_platform_appointment_waitlists.findUnique({
      where: { id: waitlistId },
    });
  if (!waitlist || waitlist.appointment_id !== appointmentId) {
    throw new Error("No such waitlist entry for this appointment");
  }

  // Permanently delete the waitlist entry
  await MyGlobal.prisma.healthcare_platform_appointment_waitlists.delete({
    where: { id: waitlistId },
  });
}
