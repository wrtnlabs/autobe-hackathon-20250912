import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformComplianceAgreement } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformComplianceAgreement";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Get a specific compliance agreement from
 * healthcare_platform_compliance_agreements by ID.
 *
 * This operation retrieves all details for a single compliance agreement,
 * including agreement type, signer, associated organization, policy version,
 * status, signature date and method, expiration, and audit fields. Designed for
 * auditing, regulatory review, or administrative reporting. Authorization is
 * enforced for system administrators only.
 *
 * @param props - Parameters for retrieval
 * @param props.systemAdmin - The authenticated system administrator requesting
 *   the agreement
 * @param props.complianceAgreementId - Unique identifier of the compliance
 *   agreement record
 * @returns The detailed compliance agreement information, with all fields,
 *   mapped and type-branded
 * @throws {Error} If the compliance agreement does not exist
 */
export async function gethealthcarePlatformSystemAdminComplianceAgreementsComplianceAgreementId(props: {
  systemAdmin: SystemadminPayload;
  complianceAgreementId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformComplianceAgreement> {
  const { complianceAgreementId } = props;
  const agreement =
    await MyGlobal.prisma.healthcare_platform_compliance_agreements.findFirst({
      where: { id: complianceAgreementId },
    });
  if (!agreement) throw new Error("Compliance agreement not found");
  return {
    id: agreement.id,
    organization_id: agreement.organization_id,
    signer_id: agreement.signer_id === null ? undefined : agreement.signer_id,
    policy_version_id: agreement.policy_version_id,
    agreement_type: agreement.agreement_type,
    status: agreement.status,
    signed_at:
      agreement.signed_at === null
        ? undefined
        : toISOStringSafe(agreement.signed_at),
    method: agreement.method === null ? undefined : agreement.method,
    expires_at:
      agreement.expires_at === null
        ? undefined
        : toISOStringSafe(agreement.expires_at),
    created_at: toISOStringSafe(agreement.created_at),
    updated_at: toISOStringSafe(agreement.updated_at),
    deleted_at:
      agreement.deleted_at === null
        ? undefined
        : toISOStringSafe(agreement.deleted_at),
  };
}
