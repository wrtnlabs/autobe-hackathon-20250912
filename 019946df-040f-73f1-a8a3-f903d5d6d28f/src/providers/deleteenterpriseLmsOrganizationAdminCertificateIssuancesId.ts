import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Delete a specific certificate issuance record by ID.
 *
 * Permanently removes a certificate issuance record from the database. Used for
 * revoking or cleaning up certification data that is no longer valid.
 *
 * Authorization: organizationAdmin role is required.
 *
 * @param props - Object containing the authenticated organization admin and the
 *   id of the certificate issuance.
 * @param props.organizationAdmin - The authorized organization admin.
 * @param props.id - The UUID of the certificate issuance to delete.
 * @throws {Error} Throws error if the certificate issuance record is not found.
 */
export async function deleteenterpriseLmsOrganizationAdminCertificateIssuancesId(props: {
  organizationAdmin: OrganizationadminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { organizationAdmin, id } = props;

  // Verify the certificate issuance exists
  const existing =
    await MyGlobal.prisma.enterprise_lms_certificate_issuances.findUnique({
      where: { id },
    });
  if (!existing) {
    throw new Error(`Certificate issuance with ID ${id} not found`);
  }

  // Perform hard delete
  await MyGlobal.prisma.enterprise_lms_certificate_issuances.delete({
    where: { id },
  });
}
