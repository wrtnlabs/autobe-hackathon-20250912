import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Delete an appointment status (hard delete) from
 * healthcare_platform_appointment_statuses table.
 *
 * This operation permanently removes an appointment status from the platform's
 * appointment status catalog. Only users with the organizationAdmin role
 * (injected as OrganizationadminPayload) may perform this action. Before
 * deletion, the function verifies that no active (not soft-deleted)
 * appointments reference the target status.
 *
 * The deletion is irreversible. Attempting to delete a status that is currently
 * referenced by any appointment, or one that does not exist, will cause an
 * error. Use this operation only for deprecated or misconfigured statuses that
 * are safe to remove from the platform.
 *
 * @param props - OrganizationAdmin: Authenticated organization admin performing
 *   the delete (injected via decorator). statusId: UUID of the appointment
 *   status to delete.
 * @returns Void
 * @throws {Error} If any active appointment references the status (prevents
 *   data inconsistency).
 * @throws {Error} If the target appointment status does not exist (Prisma error
 *   propagated).
 */
export async function deletehealthcarePlatformOrganizationAdminAppointmentStatusesStatusId(props: {
  organizationAdmin: OrganizationadminPayload;
  statusId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Block delete if any active appointment references this status
  const referencing =
    await MyGlobal.prisma.healthcare_platform_appointments.findFirst({
      where: { status_id: props.statusId, deleted_at: null },
      select: { id: true },
    });
  if (referencing) {
    throw new Error(
      "Cannot delete status: active appointments reference this status.",
    );
  }
  // 2. Perform hard delete (irreversible, propagates not-found error)
  await MyGlobal.prisma.healthcare_platform_appointment_statuses.delete({
    where: { id: props.statusId },
  });
}
