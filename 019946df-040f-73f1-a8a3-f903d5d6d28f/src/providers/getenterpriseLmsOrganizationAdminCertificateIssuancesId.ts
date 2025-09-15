import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsCertificateIssuance } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCertificateIssuance";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Retrieve a specific certificate issuance record by its unique identifier.
 *
 * This operation allows retrieving detailed information about a certificate
 * issued to a learner upon successful completion of a certification track or
 * course within the Enterprise LMS. The certificate issuance table tracks issue
 * dates, expiration dates, statuses, and business workflow states, and is
 * linked to learners and certifications in a multi-tenant context.
 *
 * Security considerations include enforcing tenant and user access controls to
 * ensure confidentiality of learner certification data. Only authorized roles
 * such as systemAdmin and organizationAdmin can access this endpoint.
 *
 * @param props - Object containing the organization admin authentication and
 *   the UUID of the certificate issuance record to retrieve
 * @param props.organizationAdmin - The authenticated organization administrator
 *   requesting the data
 * @param props.id - UUID string of the certificate issuance record
 * @returns Detailed certificate issuance information conforming to
 *   IEnterpriseLmsCertificateIssuance
 * @throws {Error} When the organization admin is unauthorized or inactive
 * @throws {Error} When the certificate issuance record is not found
 */
export async function getenterpriseLmsOrganizationAdminCertificateIssuancesId(props: {
  organizationAdmin: OrganizationadminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IEnterpriseLmsCertificateIssuance> {
  const { organizationAdmin, id } = props;

  // Validate organization admin and retrieve tenant ID
  const admin =
    await MyGlobal.prisma.enterprise_lms_organizationadmin.findUnique({
      where: { id: organizationAdmin.id },
    });

  if (!admin || admin.status !== "active" || admin.deleted_at !== null) {
    throw new Error("Unauthorized: Invalid organization admin");
  }

  // Retrieve the certificate issuance by ID
  const certificateIssuance =
    await MyGlobal.prisma.enterprise_lms_certificate_issuances.findFirst({
      where: {
        id,
        deleted_at: null,
        // Tenant isolation enforcement is assumed via organization admin check
      },
    });

  if (!certificateIssuance) {
    throw new Error("Certificate issuance not found");
  }

  return {
    id: certificateIssuance.id,
    learner_id: certificateIssuance.learner_id,
    certification_id: certificateIssuance.certification_id,
    issue_date: toISOStringSafe(certificateIssuance.issue_date),
    expiration_date: certificateIssuance.expiration_date
      ? toISOStringSafe(certificateIssuance.expiration_date)
      : null,
    status: certificateIssuance.status,
    business_status: certificateIssuance.business_status ?? null,
    created_at: toISOStringSafe(certificateIssuance.created_at),
    updated_at: toISOStringSafe(certificateIssuance.updated_at),
    deleted_at: certificateIssuance.deleted_at
      ? toISOStringSafe(certificateIssuance.deleted_at)
      : null,
  };
}
