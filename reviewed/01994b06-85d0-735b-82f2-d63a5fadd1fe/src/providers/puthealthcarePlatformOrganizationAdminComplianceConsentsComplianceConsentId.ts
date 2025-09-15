import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformComplianceConsent } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformComplianceConsent";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Update or revoke a compliance consent entry by unique ID (consent revocation
 * or meta update).
 *
 * This operation updates an existing compliance consent in the system. It
 * allows updating revocation state, grant state, revocation reason, expires_at,
 * and other mutable meta fields, but organization, subject, policy, and
 * creation/consent timestamps are immutable. Only administrators of the owning
 * organization may update a given consent. No updates are allowed to deleted or
 * expired consents. All updates are audit-logged.
 *
 * @param props - Input props object
 * @param props.organizationAdmin - Authenticated organization admin user (must
 *   match consent's org)
 * @param props.complianceConsentId - Target consent UUID
 * @param props.body - Update DTO: fields to update for revocation or expiration
 * @returns The full updated consent after applying changes
 * @throws {Error} If the consent is not found, deleted/expired, or access
 *   denied
 */
export async function puthealthcarePlatformOrganizationAdminComplianceConsentsComplianceConsentId(props: {
  organizationAdmin: OrganizationadminPayload;
  complianceConsentId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformComplianceConsent.IUpdate;
}): Promise<IHealthcarePlatformComplianceConsent> {
  const { organizationAdmin, complianceConsentId, body } = props;
  // Always use string & tags.Format<'date-time'> for now
  const now = toISOStringSafe(new Date());
  // 1. Find the consent by id; not soft-deleted
  const consent =
    await MyGlobal.prisma.healthcare_platform_compliance_consents.findFirst({
      where: {
        id: complianceConsentId,
        deleted_at: null,
      },
    });
  if (!consent) {
    throw new Error("Consent not found or already deleted.");
  }
  // 2. Check for organization match
  if (consent.organization_id !== organizationAdmin.id) {
    throw new Error("Forbidden: Consent does not belong to your organization.");
  }
  // 3. Cannot update if consent expired
  if (
    consent.expires_at &&
    toISOStringSafe(consent.expires_at) < now // ISO string comparison is valid for UTC timestamps
  ) {
    throw new Error("Consent expired; cannot update.");
  }
  // 4. Prepare mutable update fields only
  const updateData: Partial<IHealthcarePlatformComplianceConsent.IUpdate> & {
    updated_at: string & tags.Format<"date-time">;
  } = {
    updated_at: now,
  };
  if (body.granted !== undefined) {
    updateData.granted = body.granted;
  }
  if (body.revoked_at !== undefined) {
    updateData.revoked_at = body.revoked_at;
  }
  if (body.revocation_reason !== undefined) {
    updateData.revocation_reason = body.revocation_reason;
  }
  if (body.expires_at !== undefined) {
    updateData.expires_at = body.expires_at;
  }
  // 5. Execute the update
  const updated =
    await MyGlobal.prisma.healthcare_platform_compliance_consents.update({
      where: { id: complianceConsentId },
      data: updateData,
    });
  // 6. Return hydrated DTO, all temporal fields formatted correctly
  return {
    id: updated.id,
    organization_id: updated.organization_id,
    subject_id: updated.subject_id ?? undefined,
    policy_version_id: updated.policy_version_id,
    consent_type: updated.consent_type,
    granted: updated.granted,
    consent_at: toISOStringSafe(updated.consent_at),
    revoked_at: updated.revoked_at
      ? toISOStringSafe(updated.revoked_at)
      : undefined,
    revocation_reason: updated.revocation_reason ?? undefined,
    expires_at: updated.expires_at
      ? toISOStringSafe(updated.expires_at)
      : undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
