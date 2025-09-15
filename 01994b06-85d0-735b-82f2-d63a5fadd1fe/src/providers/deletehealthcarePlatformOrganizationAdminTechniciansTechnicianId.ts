import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Permanently remove a technician from the healthcare_platform_technicians
 * table.
 *
 * This operation performs a soft delete by setting the deleted_at timestamp on
 * the technician's record. It ensures that audit and compliance policies are
 * met by retaining the record and not performing a hard delete. Only
 * organizationAdmin authenticated users are authorized to call this endpoint.
 * Attempts to remove nonexistent or already-deleted technicians will result in
 * a business error. This action is irreversible and must be recorded for
 * audit/compliance.
 *
 * @param props - Request properties
 * @param props.organizationAdmin - The authenticated organization admin
 *   performing the deletion
 * @param props.technicianId - Unique identifier for the technician to remove
 * @returns Void
 * @throws {Error} If the technician does not exist or is already soft-deleted
 */
export async function deletehealthcarePlatformOrganizationAdminTechniciansTechnicianId(props: {
  organizationAdmin: OrganizationadminPayload;
  technicianId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { organizationAdmin, technicianId } = props;

  // Step 1: Fetch technician and ensure not already deleted
  const technician =
    await MyGlobal.prisma.healthcare_platform_technicians.findFirst({
      where: {
        id: technicianId,
        deleted_at: null,
      },
    });
  if (!technician) {
    throw new Error("Technician not found or already deleted");
  }

  // Step 2: Perform soft delete (set deleted_at)
  const deletedAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );
  await MyGlobal.prisma.healthcare_platform_technicians.update({
    where: { id: technicianId },
    data: { deleted_at: deletedAt },
  });
}
