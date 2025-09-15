import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformComplianceAgreement } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformComplianceAgreement";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Create a new compliance agreement entry in
 * healthcare_platform_compliance_agreements.
 *
 * This endpoint allows a system administrator to create a new, legally binding
 * compliance agreement record for a user (or org-level) within the
 * healthcare_platform_compliance_agreements table. It ensures all required core
 * and optional audit fields are captured, linking to the organization, specific
 * policy version, agreement type, signer, status, and signature
 * method/timestamps where provided. This is essential for supporting regulatory
 * and contractual workflows including HIPAA, data processing consents, terms of
 * service, AUP, or research. If optional fields are not specified, they are
 * omitted or set undefined as per schema compliance. Soft delete timestamp is
 * null initially.
 *
 * Only users authenticated as full system administrators can perform this
 * operation, and appropriate referential integrity is enforced by the database.
 * Attempts to create duplicate records, missing policy versions, or invalid
 * references will result in errors.
 *
 * @param props - Object containing creation input and the authenticated
 *   SystemadminPayload
 * @param props.systemAdmin - The authenticated system administrator
 *   (SystemadminPayload)
 * @param props.body - The agreement creation payload
 *   (IHealthcarePlatformComplianceAgreement.ICreate)
 * @returns The newly created compliance agreement record
 *   (IHealthcarePlatformComplianceAgreement)
 * @throws {Prisma.PrismaClientKnownRequestError} If references are invalid, or
 *   agreement violates business/data integrity constraints
 */
export async function posthealthcarePlatformSystemAdminComplianceAgreements(props: {
  systemAdmin: SystemadminPayload;
  body: IHealthcarePlatformComplianceAgreement.ICreate;
}): Promise<IHealthcarePlatformComplianceAgreement> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.healthcare_platform_compliance_agreements.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        organization_id: props.body.organization_id,
        signer_id: props.body.signer_id ?? undefined,
        policy_version_id: props.body.policy_version_id,
        agreement_type: props.body.agreement_type,
        status: props.body.status,
        signed_at: props.body.signed_at ?? undefined,
        method: props.body.method ?? undefined,
        expires_at: props.body.expires_at ?? undefined,
        created_at: now,
        updated_at: now,
        deleted_at: undefined,
      },
    });
  return {
    id: created.id,
    organization_id: created.organization_id,
    signer_id: created.signer_id ?? undefined,
    policy_version_id: created.policy_version_id,
    agreement_type: created.agreement_type,
    status: created.status,
    signed_at: created.signed_at ?? undefined,
    method: created.method ?? undefined,
    expires_at: created.expires_at ?? undefined,
    created_at: created.created_at,
    updated_at: created.updated_at,
    deleted_at: created.deleted_at ?? undefined,
  };
}
