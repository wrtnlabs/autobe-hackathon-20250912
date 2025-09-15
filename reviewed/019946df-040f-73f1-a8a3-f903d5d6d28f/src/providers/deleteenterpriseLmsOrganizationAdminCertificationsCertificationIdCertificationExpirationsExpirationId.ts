import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Delete the certification expiration policy identified by expirationId
 * belonging to the certification specified by certificationId.
 *
 * This operation permanently removes the expiration policy record from the
 * database with no recovery option.
 *
 * Role-based security restricts access to organizationAdmin users. Validation
 * ensures the existence of the policy before deletion.
 *
 * @param props - Object containing the authenticated organization admin and
 *   identifying keys
 * @param props.organizationAdmin - The authorized organization administrator
 *   performing the deletion
 * @param props.certificationId - UUID of the certification to which the
 *   expiration policy belongs
 * @param props.expirationId - UUID of the expiration policy to delete
 * @throws {Error} If the expiration policy does not exist or does not belong to
 *   the specified certification
 */
export async function deleteenterpriseLmsOrganizationAdminCertificationsCertificationIdCertificationExpirationsExpirationId(props: {
  organizationAdmin: OrganizationadminPayload;
  certificationId: string & tags.Format<"uuid">;
  expirationId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { organizationAdmin, certificationId, expirationId } = props;

  // Verify existence and ownership of the certification expiration policy
  await MyGlobal.prisma.enterprise_lms_certification_expirations.findFirstOrThrow(
    {
      where: {
        id: expirationId,
        certification_id: certificationId,
      },
    },
  );

  // Hard delete the certification expiration policy
  await MyGlobal.prisma.enterprise_lms_certification_expirations.delete({
    where: { id: expirationId },
  });
}
