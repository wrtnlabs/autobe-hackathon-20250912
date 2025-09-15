import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformPolicyVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPolicyVersion";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Create a new policy version entry in healthcare_platform_policy_versions for
 * compliance and legal management.
 *
 * This operation allows authorized system administrators to create a new
 * immutable policy version record. Each version captures all
 * details—organization, type, version, effectivity, and document metadata.
 * Validation ensures uniqueness in (organization_id, policy_type, version) and
 * that the expiration (if set) is after the effective date. Returns the fully
 * persisted record for compliance workflows. Dates and UUIDs are branded;
 * native Date is never used.
 *
 * @param props - Input object containing the system administrator payload and
 *   policy version creation body
 * @param props.systemAdmin - Authenticated system admin payload (must have type
 *   'systemAdmin')
 * @param props.body - IHealthcarePlatformPolicyVersion.ICreate containing
 *   organization_id, policy_type, version, effective_at, expires_at (optional),
 *   title, document_uri, document_hash (optional)
 * @returns The newly created IHealthcarePlatformPolicyVersion with all metadata
 *   fields populated
 * @throws {Error} If a policy version for the organization, policy_type, and
 *   version already exists (uniqueness violation)
 * @throws {Error} If expires_at (when provided) is not later than effective_at
 */
export async function posthealthcarePlatformSystemAdminPolicyVersions(props: {
  systemAdmin: SystemadminPayload;
  body: IHealthcarePlatformPolicyVersion.ICreate;
}): Promise<IHealthcarePlatformPolicyVersion> {
  const { systemAdmin, body } = props;

  // Uniqueness: Verify no existing policy version for same org/type/version
  const existing =
    await MyGlobal.prisma.healthcare_platform_policy_versions.findFirst({
      where: {
        organization_id: body.organization_id,
        policy_type: body.policy_type,
        version: body.version,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (existing) {
    throw new Error(
      "A policy version with the same organization, type, and version already exists.",
    );
  }

  // Business validation: If expires_at present, must be after effective_at
  if (
    body.expires_at !== undefined &&
    body.expires_at !== null &&
    body.effective_at >= body.expires_at
  ) {
    throw new Error(
      "Expiration date (expires_at) must be after effectivity (effective_at).",
    );
  }

  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const id: string & tags.Format<"uuid"> = v4();

  const created =
    await MyGlobal.prisma.healthcare_platform_policy_versions.create({
      data: {
        id,
        organization_id: body.organization_id,
        policy_type: body.policy_type,
        version: body.version,
        effective_at: body.effective_at,
        expires_at: body.expires_at ?? undefined,
        title: body.title,
        document_uri: body.document_uri,
        document_hash: body.document_hash ?? undefined,
        created_at: now,
        updated_at: now,
      },
    });

  // Construct output from returned DB row, normalizing nullables and dates
  return {
    id: created.id,
    organization_id: created.organization_id,
    policy_type: created.policy_type,
    version: created.version,
    effective_at: created.effective_at,
    expires_at: created.expires_at ?? undefined,
    title: created.title,
    document_uri: created.document_uri,
    document_hash: created.document_hash ?? undefined,
    created_at: created.created_at,
    updated_at: created.updated_at,
    deleted_at: created.deleted_at ?? undefined,
  };
}
