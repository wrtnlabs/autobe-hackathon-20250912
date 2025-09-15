import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Soft delete a certification by ID.
 *
 * Sets the 'deleted_at' timestamp to mark the certification as deleted without
 * physically removing it from the database.
 *
 * This soft deletion maintains historical data integrity for audit and
 * compliance.
 *
 * Only users with sufficient privileges can perform this operation.
 *
 * Associated expirations and issuances remain unchanged and should be handled
 * separately.
 *
 * @param props - Object containing the authenticated organization admin and the
 *   certification ID to delete
 * @param props.organizationAdmin - The authenticated organization admin
 *   performing the delete
 * @param props.certificationId - Unique identifier of the certification to
 *   delete
 * @throws {Error} When the certification does not exist or the admin is
 *   unauthorized
 */
export async function deleteenterpriseLmsOrganizationAdminCertificationsCertificationId(props: {
  organizationAdmin: OrganizationadminPayload;
  certificationId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { organizationAdmin, certificationId } = props;

  // Verify the certification exists and belongs to the admin's tenant
  const certification =
    await MyGlobal.prisma.enterprise_lms_certifications.findFirst({
      where: {
        id: certificationId,
        tenant_id: organizationAdmin.id,
        deleted_at: null,
      },
    });

  if (!certification) {
    throw new Error("Certification not found or unauthorized");
  }

  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  await MyGlobal.prisma.enterprise_lms_certifications.update({
    where: { id: certificationId },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
}
