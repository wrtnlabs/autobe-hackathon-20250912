import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Erase (soft delete) a compliance review record by ID
 * (healthcare_platform_compliance_reviews table).
 *
 * This operation marks a compliance review as deleted by setting its deleted_at
 * timestamp, ensuring it is excluded from standard user listings but available
 * for audit queries. Only organization administrators can perform this
 * operation. All erasure attempts must enforce RBAC and prevent deletion if
 * already deleted or not found.
 *
 * @param props - OrganizationAdmin: Authenticated organization admin user
 *   (OrganizationadminPayload) complianceReviewId: UUID of the compliance
 *   review record to erase
 * @returns Void
 * @throws {Error} When review does not exist or is already deleted
 * @throws {Error} When admin user cannot be found (deleted, etc)
 */
export async function deletehealthcarePlatformOrganizationAdminComplianceReviewsComplianceReviewId(props: {
  organizationAdmin: OrganizationadminPayload;
  complianceReviewId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { organizationAdmin, complianceReviewId } = props;
  // 1. Fetch review by id and deleted_at: null
  const review =
    await MyGlobal.prisma.healthcare_platform_compliance_reviews.findFirst({
      where: { id: complianceReviewId, deleted_at: null },
      select: { id: true, organization_id: true },
    });
  if (!review) {
    throw new Error("Compliance review not found or already deleted");
  }
  // 2. Fetch admin to ensure their existence (deleted_at:null)
  const admin =
    await MyGlobal.prisma.healthcare_platform_organizationadmins.findFirst({
      where: { id: organizationAdmin.id, deleted_at: null },
      select: { id: true },
    });
  if (!admin) {
    throw new Error("Admin not found or already deleted");
  }
  // 3. Soft-delete
  const deletedAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );
  await MyGlobal.prisma.healthcare_platform_compliance_reviews.update({
    where: { id: complianceReviewId },
    data: { deleted_at: deletedAt },
  });
  // Audit logging can be added here if needed.
}
