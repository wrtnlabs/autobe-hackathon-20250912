import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformComplianceConsent } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformComplianceConsent";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Create a new compliance consent for a user or patient under a specific
 * organization and policy version.
 *
 * This operation allows creation of a compliance consent record tied to an
 * organization, subject (patient or staff), policy version, and consent type.
 * Consent records are append-only for audit and compliance, and only users with
 * 'organizationAdmin' privileges may create them. The function enforces
 * uniqueness (no duplicate active consent for org/subject/policy/version/type),
 * validates referenced resource existence, and maps all fields as required by
 * DTO contract, ensuring correct handling of nullable and optional fields.
 *
 * @param props - OrganizationAdmin: The authenticated organization
 *   administrator performing the consent create operation body: The consent
 *   creation payload (organization id, subject id (optional), policy version
 *   id, consent type, grant status, consent timestamp, optional expiry)
 * @returns The created compliance consent record, with all fields mapped and
 *   formatted as required.
 * @throws {Error} When the organization or policy version do not exist, are
 *   deleted, or an active duplicate consent already exists
 */
export async function posthealthcarePlatformOrganizationAdminComplianceConsents(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IHealthcarePlatformComplianceConsent.ICreate;
}): Promise<IHealthcarePlatformComplianceConsent> {
  const { organizationAdmin, body } = props;

  // Validate organization exists and is not deleted
  const organization =
    await MyGlobal.prisma.healthcare_platform_organizations.findFirst({
      where: { id: body.organization_id, deleted_at: null },
    });
  if (!organization) {
    throw new Error("Organization not found or is deleted.");
  }

  // Validate policy version exists and is not deleted
  const policyVersion =
    await MyGlobal.prisma.healthcare_platform_policy_versions.findFirst({
      where: { id: body.policy_version_id, deleted_at: null },
    });
  if (!policyVersion) {
    throw new Error("Policy version not found or is deleted.");
  }

  // Prevent duplicate active consent (append-only uniqueness constraint)
  const existing =
    await MyGlobal.prisma.healthcare_platform_compliance_consents.findFirst({
      where: {
        organization_id: body.organization_id,
        subject_id: body.subject_id ?? null,
        policy_version_id: body.policy_version_id,
        consent_type: body.consent_type,
        granted: true,
        deleted_at: null,
      },
    });
  if (existing) {
    throw new Error(
      "An active consent already exists for this organization, subject, policy, and type.",
    );
  }

  // Timestamps
  const now = toISOStringSafe(new Date());

  // Prepare optional revocation fields
  const revoked_at = body.granted ? null : body.consent_at;
  const revocation_reason = body.granted ? null : "Consent revoked";

  // Insert consent record
  const created =
    await MyGlobal.prisma.healthcare_platform_compliance_consents.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        organization_id: body.organization_id,
        subject_id: body.subject_id ?? null,
        policy_version_id: body.policy_version_id,
        consent_type: body.consent_type,
        granted: body.granted,
        consent_at: body.consent_at,
        expires_at: body.expires_at ?? null,
        revoked_at,
        revocation_reason,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

  // Map nullable/optional fields as per DTO contract
  return {
    id: created.id,
    organization_id: created.organization_id,
    subject_id: created.subject_id ?? undefined,
    policy_version_id: created.policy_version_id,
    consent_type: created.consent_type,
    granted: created.granted,
    consent_at: created.consent_at,
    revoked_at: created.revoked_at ?? undefined,
    revocation_reason: created.revocation_reason ?? undefined,
    expires_at: created.expires_at ?? undefined,
    created_at: created.created_at,
    updated_at: created.updated_at,
    deleted_at: created.deleted_at ?? undefined,
  };
}
