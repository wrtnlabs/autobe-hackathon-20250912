import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformComplianceConsent } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformComplianceConsent";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Retrieve full detail for a specific compliance consent record by ID.
 *
 * This endpoint allows a system administrator to access the full
 * audit/compliance record for a consent event, including identity,
 * organization, policy, granted/revoked timestamp, rationale, and expiration
 * details. Only system administrators and organization administrators are
 * permitted for such audit-level access. All access is centrally logged for
 * privacy/compliance.
 *
 * @param props - Input containing system administrator authentication and the
 *   unique consent ID to retrieve
 * @param props.systemAdmin - Authenticated system admin payload (RBAC enforced)
 * @param props.complianceConsentId - UUID of the compliance consent record to
 *   retrieve
 * @returns The full IHealthcarePlatformComplianceConsent detail for the
 *   specified ID
 * @throws {Error} If the compliance consent record does not exist
 */
export async function gethealthcarePlatformSystemAdminComplianceConsentsComplianceConsentId(props: {
  systemAdmin: SystemadminPayload;
  complianceConsentId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformComplianceConsent> {
  const { complianceConsentId } = props;
  const result =
    await MyGlobal.prisma.healthcare_platform_compliance_consents.findUnique({
      where: { id: complianceConsentId },
    });
  if (!result) throw new Error("Compliance consent not found");
  return {
    id: result.id,
    organization_id: result.organization_id,
    subject_id: result.subject_id ?? undefined,
    policy_version_id: result.policy_version_id,
    consent_type: result.consent_type,
    granted: result.granted,
    consent_at: toISOStringSafe(result.consent_at),
    revoked_at: result.revoked_at
      ? toISOStringSafe(result.revoked_at)
      : undefined,
    revocation_reason: result.revocation_reason ?? undefined,
    expires_at: result.expires_at
      ? toISOStringSafe(result.expires_at)
      : undefined,
    created_at: toISOStringSafe(result.created_at),
    updated_at: toISOStringSafe(result.updated_at),
    deleted_at: result.deleted_at
      ? toISOStringSafe(result.deleted_at)
      : undefined,
  };
}
