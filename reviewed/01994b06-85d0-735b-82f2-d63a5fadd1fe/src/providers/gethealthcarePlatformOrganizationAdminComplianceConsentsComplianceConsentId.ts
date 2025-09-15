import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformComplianceConsent } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformComplianceConsent";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Retrieve full detail for a specific compliance consent record by ID.
 *
 * This function retrieves a comprehensive compliance consent record from the
 * platform by its unique consent ID. It ensures the authenticated organization
 * admin only accesses consent records that belong to their organization,
 * enforcing strict RBAC. All date and datetime values are normalized to ISO
 * 8601 format and branded as required. Access violations or missing consents
 * result in errors.
 *
 * @param props - Parameters including the authenticated organization admin's
 *   payload and the target complianceConsentId.
 * @param props.organizationAdmin - The authenticated organization admin user's
 *   payload (must be from the organization that owns the consent).
 * @param props.complianceConsentId - Unique identifier of the compliance
 *   consent record to retrieve (UUID).
 * @returns The full detailed compliance consent record, as per the
 *   IHealthcarePlatformComplianceConsent structure.
 * @throws {Error} If the compliance consent record is not found, has been
 *   deleted, or does not belong to the admin's organization.
 */
export async function gethealthcarePlatformOrganizationAdminComplianceConsentsComplianceConsentId(props: {
  organizationAdmin: OrganizationadminPayload;
  complianceConsentId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformComplianceConsent> {
  const { organizationAdmin, complianceConsentId } = props;

  // 1. Fetch consent record (filtering out soft deleted consents)
  const consent =
    await MyGlobal.prisma.healthcare_platform_compliance_consents.findFirst({
      where: {
        id: complianceConsentId,
        deleted_at: null,
      },
    });
  if (!consent) throw new Error("Compliance consent not found");

  // 2. Fetch the admin user to confirm identity and retrieve the orgId
  const admin =
    await MyGlobal.prisma.healthcare_platform_organizationadmins.findFirst({
      where: { id: organizationAdmin.id, deleted_at: null },
    });
  if (!admin) throw new Error("Admin not found or deleted");

  // 3. RBAC: Ensure the consent belongs to this admin's organization
  if (consent.organization_id !== admin.id) {
    throw new Error("Forbidden: Consent does not belong to your organization");
  }

  // 4. Return with strict date/datetime normalization and correct output types. All conversion via toISOStringSafe().
  return {
    id: consent.id,
    organization_id: consent.organization_id,
    subject_id: consent.subject_id ?? undefined,
    policy_version_id: consent.policy_version_id,
    consent_type: consent.consent_type,
    granted: consent.granted,
    consent_at: toISOStringSafe(consent.consent_at),
    revoked_at: consent.revoked_at
      ? toISOStringSafe(consent.revoked_at)
      : undefined,
    revocation_reason: consent.revocation_reason ?? undefined,
    expires_at: consent.expires_at
      ? toISOStringSafe(consent.expires_at)
      : undefined,
    created_at: toISOStringSafe(consent.created_at),
    updated_at: toISOStringSafe(consent.updated_at),
    deleted_at: consent.deleted_at
      ? toISOStringSafe(consent.deleted_at)
      : undefined,
  };
}
