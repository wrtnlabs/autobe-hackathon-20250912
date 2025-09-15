import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Archive or erase a legal hold entry (soft delete for audit purposes).
 *
 * This operation deactivates (archives) a legal hold entry identified by
 * legalHoldId. It performs a soft-delete by marking deleted_at with the current
 * timestamp for compliance retention and audit purposes. The function ensures
 * that the legal hold is not already deleted and that there are no dependent
 * compliance reviews. Only system admin users are permitted to erase legal
 * holds. Attempting to delete a non-existent or dependent-locked hold will
 * raise an error. No direct hard delete is performed. This action is
 * security/audit critical and should be logged upstream if needed.
 *
 * @param props - SystemAdmin: Authenticated SystemadminPayload performing the
 *   operation legalHoldId: UUID of the legal hold entry to archive/erase
 * @returns Void
 * @throws {Error} If the legal hold does not exist or is already deleted
 * @throws {Error} If there are undeleted dependent compliance reviews
 *   referencing this hold
 */
export async function deletehealthcarePlatformSystemAdminLegalHoldsLegalHoldId(props: {
  systemAdmin: SystemadminPayload;
  legalHoldId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { legalHoldId } = props;

  // 1. Verify the legal hold exists and is not already deleted
  const legalHold =
    await MyGlobal.prisma.healthcare_platform_legal_holds.findFirst({
      where: {
        id: legalHoldId,
        deleted_at: null,
      },
    });
  if (legalHold === null) {
    throw new Error("Legal hold not found or already deleted");
  }

  // 2. Check for dependent compliance reviews that block deletion
  const hasDependency =
    await MyGlobal.prisma.healthcare_platform_compliance_reviews.findFirst({
      where: {
        hold_id: legalHoldId,
        deleted_at: null,
      },
    });
  if (hasDependency !== null) {
    throw new Error(
      "Cannot delete legal hold: dependent compliance reviews exist",
    );
  }

  // 3. Perform soft delete (set deleted_at)
  await MyGlobal.prisma.healthcare_platform_legal_holds.update({
    where: { id: legalHoldId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });

  // No return value (void)
  return;
}
