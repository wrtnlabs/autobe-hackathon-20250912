import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Archive or erase a legal hold entry (soft delete for audit purposes).
 *
 * Permanently deactivates (archives via soft delete) a legal hold entry
 * specified by its ID. Only users with organization admin privileges may
 * perform this operation. The legal hold must be active and not referenced by
 * ongoing reviews or investigations. This function sets the deleted_at
 * timestamp, effectively disabling the hold while retaining it for
 * audit/compliance purposes. If the hold is not found, is already deleted, or
 * is locked under policy (status not 'active'), an error is thrown. No
 * hard-delete is performed; all removals are soft.
 *
 * @param props - Function props
 * @param props.organizationAdmin - Authenticated organization admin payload
 * @param props.legalHoldId - UUID of the legal hold to archive/erase
 * @returns Void
 * @throws {Error} If legal hold is not found, already deleted, or deletion is
 *   not permitted due to active policy/investigations.
 */
export async function deletehealthcarePlatformOrganizationAdminLegalHoldsLegalHoldId(props: {
  organizationAdmin: OrganizationadminPayload;
  legalHoldId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { organizationAdmin, legalHoldId } = props;

  // Find active (undeleted) legal hold by ID
  const legalHold =
    await MyGlobal.prisma.healthcare_platform_legal_holds.findFirst({
      where: {
        id: legalHoldId,
        deleted_at: null,
      },
    });

  if (!legalHold) {
    throw new Error("Legal hold not found, already deleted, or inaccessible");
  }

  // Simulate lock/ongoing investigation via status field
  if (legalHold.status !== "active") {
    throw new Error(
      "Cannot delete legal hold: locked, under investigation, or in an invalid state",
    );
  }

  // Soft delete: set deleted_at to now (ISO string)
  await MyGlobal.prisma.healthcare_platform_legal_holds.update({
    where: { id: legalHoldId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
}
