import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformComplianceAgreement } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformComplianceAgreement";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Update details for an existing compliance agreement in
 * healthcare_platform_compliance_agreements.
 *
 * This operation modifies one or more fields of an existing compliance
 * agreement record (status, signed_at, method, expires_at) identified by its
 * UUID. Only mutable, reviewable agreement properties are updatable—immutable
 * fields and historical signatures are preserved. The operation rejects
 * modification to deleted or non-existent agreements and ensures date/time
 * consistency across all fields.
 *
 * System administrator authentication is required, and the operation ensures
 * result consistency with IHealthcarePlatformComplianceAgreement typing. All
 * DateTime fields are returned as ISO 8601 strings branded with
 * tags.Format<'date-time'>.
 *
 * @param props - Contains authenticated systemAdmin, complianceAgreementId
 *   (UUID), and body with allowable update fields
 * @param props.systemAdmin - The authenticated SystemadminPayload
 *   (authorization and audit duty enforced upstream)
 * @param props.complianceAgreementId - UUID of the compliance agreement record
 *   to update
 * @param props.body - Partial update body (status, signed_at, method,
 *   expires_at)
 * @returns The updated compliance agreement record as
 *   IHealthcarePlatformComplianceAgreement
 * @throws {Error} If the compliance agreement is not found or has been deleted
 *   at update time.
 */
export async function puthealthcarePlatformSystemAdminComplianceAgreementsComplianceAgreementId(props: {
  systemAdmin: SystemadminPayload;
  complianceAgreementId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformComplianceAgreement.IUpdate;
}): Promise<IHealthcarePlatformComplianceAgreement> {
  const { complianceAgreementId, body } = props;
  // Ensure the agreement exists and is not soft-deleted
  const record =
    await MyGlobal.prisma.healthcare_platform_compliance_agreements.findFirst({
      where: { id: complianceAgreementId, deleted_at: null },
    });
  if (!record)
    throw new Error("Compliance agreement not found or already deleted.");
  // Set updated_at to now (ISO)
  const now = toISOStringSafe(new Date());
  // Update only allowed fields
  const updated =
    await MyGlobal.prisma.healthcare_platform_compliance_agreements.update({
      where: { id: complianceAgreementId },
      data: {
        status: body.status ?? undefined,
        signed_at: body.signed_at ?? undefined,
        method: body.method ?? undefined,
        expires_at: body.expires_at ?? undefined,
        updated_at: now,
      },
    });
  return {
    id: updated.id,
    organization_id: updated.organization_id,
    signer_id: updated.signer_id ?? undefined,
    policy_version_id: updated.policy_version_id,
    agreement_type: updated.agreement_type,
    status: updated.status,
    signed_at: updated.signed_at
      ? toISOStringSafe(updated.signed_at)
      : undefined,
    method: updated.method ?? undefined,
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
