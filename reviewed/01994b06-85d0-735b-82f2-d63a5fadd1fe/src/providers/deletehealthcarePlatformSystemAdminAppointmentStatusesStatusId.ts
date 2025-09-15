import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Delete an appointment status (hard delete) from
 * healthcare_platform_appointment_statuses table.
 *
 * Permanently deletes an appointment status, provided it is not referenced by
 * any appointment. Only system administrators may perform this operation. This
 * process checks for any referencing appointments (appointments with status_id
 * = statusId), blocks deletion if any exist, and otherwise performs a hard
 * delete. Attempting to delete an appointment status in use or not found will
 * result in an error.
 *
 * @param props - Parameters for status deletion
 * @param props.systemAdmin - The authenticated system admin triggering this
 *   operation
 * @param props.statusId - The UUID of the appointment status to delete
 * @returns Void
 * @throws {Error} If the status does not exist or is currently referenced by
 *   any appointment
 */
export async function deletehealthcarePlatformSystemAdminAppointmentStatusesStatusId(props: {
  systemAdmin: SystemadminPayload;
  statusId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Must verify that the appointment status exists (prisma throws 404 if not)
  await MyGlobal.prisma.healthcare_platform_appointment_statuses.findUniqueOrThrow(
    {
      where: { id: props.statusId },
    },
  );

  // 2. Block deletion if any appointments reference this status
  const referenced =
    await MyGlobal.prisma.healthcare_platform_appointments.findFirst({
      where: { status_id: props.statusId },
    });
  if (referenced) {
    throw new Error(
      "Cannot delete appointment status: It is currently referenced by one or more appointments.",
    );
  }

  // 3. Safe to perform hard delete (no cascade, no soft delete field in schema)
  await MyGlobal.prisma.healthcare_platform_appointment_statuses.delete({
    where: { id: props.statusId },
  });
}
