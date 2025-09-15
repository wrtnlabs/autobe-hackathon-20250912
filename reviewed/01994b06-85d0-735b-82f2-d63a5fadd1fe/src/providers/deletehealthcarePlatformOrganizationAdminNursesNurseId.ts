import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Soft delete (archive) a nurse record in healthcare_platform_nurses by ID.
 *
 * This endpoint marks a nurse as deleted by setting the deleted_at column (soft
 * delete) using the provided nurseId. Only organization-level admins may use
 * this endpoint. If the nurse does not exist or is already deleted, throws an
 * error. The record remains present for future compliance audits and potential
 * restoration, as required by industry regulations.
 *
 * @param props - Object containing the organization admin payload and the
 *   nurseId to delete
 * @param props.organizationAdmin - Authenticated org admin user
 *   (OrganizationadminPayload)
 * @param props.nurseId - Unique identifier (UUID) of the nurse to delete
 * @returns Void
 * @throws {Error} If nurse does not exist or is already deleted.
 */
export async function deletehealthcarePlatformOrganizationAdminNursesNurseId(props: {
  organizationAdmin: OrganizationadminPayload;
  nurseId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { nurseId } = props;

  // Check if nurse exists and is not already deleted
  const nurse = await MyGlobal.prisma.healthcare_platform_nurses.findFirst({
    where: { id: nurseId, deleted_at: null },
  });
  if (!nurse) {
    throw new Error("Nurse not found or already deleted");
  }

  // Perform soft delete by setting deleted_at timestamp
  await MyGlobal.prisma.healthcare_platform_nurses.update({
    where: { id: nurseId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
}
