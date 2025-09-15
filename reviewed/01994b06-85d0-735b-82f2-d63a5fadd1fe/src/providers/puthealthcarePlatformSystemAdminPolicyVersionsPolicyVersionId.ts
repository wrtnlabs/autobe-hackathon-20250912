import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformPolicyVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPolicyVersion";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Update a policy version entry in healthcare_platform_policy_versions,
 * allowing legal/compliance metadata correction and auditability.
 *
 * This operation allows an authenticated system admin to update a policy
 * version's fields, including version label, effective/expiration windows,
 * document URI/hash, and title. It enforces business logic: the expiration date
 * must not be before the effective date (and not in the past if set). All
 * modifications update the updated_at timestamp and preserve audit trail. Only
 * system admin users are permitted to invoke this; attempts on non-existent
 * records will throw an error. All fields are handled immutably and type-safe,
 * with proper date/datetime conversions.
 *
 * @param props - The props object containing request data
 * @param props.systemAdmin - Authenticated SystemadminPayload for authorization
 * @param props.policyVersionId - The UUID of the policy version record to
 *   update
 * @param props.body - Partial or full update payload for policy version fields:
 *   version, effective_at, expires_at, title, document_uri, document_hash
 * @returns The updated policy version record with all metadata, title, version,
 *   valid dates, and document reference fields
 * @throws {Error} If the policy version does not exist, or if validation rules
 *   are violated (e.g., invalid date logic)
 */
export async function puthealthcarePlatformSystemAdminPolicyVersionsPolicyVersionId(props: {
  systemAdmin: SystemadminPayload;
  policyVersionId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformPolicyVersion.IUpdate;
}): Promise<IHealthcarePlatformPolicyVersion> {
  const { systemAdmin, policyVersionId, body } = props;

  // Find the existing policy version (excluding deleted)
  const existing =
    await MyGlobal.prisma.healthcare_platform_policy_versions.findFirst({
      where: { id: policyVersionId, deleted_at: null },
    });
  if (!existing) {
    throw new Error("Policy version not found");
  }

  // Use ISO date strings for validation comparisons
  const newEffectiveAt =
    body.effective_at !== undefined ? body.effective_at : existing.effective_at;
  const newExpiresAt =
    body.expires_at !== undefined ? body.expires_at : existing.expires_at;

  // Validate that expiration (if set) is at/after effective_at
  if (newExpiresAt !== null && newExpiresAt !== undefined) {
    if (
      newEffectiveAt !== undefined &&
      Date.parse(newExpiresAt) < Date.parse(newEffectiveAt)
    ) {
      throw new Error("Expiration date must not be before effective date");
    }
    // Validate not in the past (expiration date >= now)
    const nowIso = toISOStringSafe(new Date());
    if (Date.parse(newExpiresAt) < Date.parse(nowIso)) {
      throw new Error("Expiration date may not be in the past");
    }
  }

  // Write update (fields not provided are not changed)
  const updated =
    await MyGlobal.prisma.healthcare_platform_policy_versions.update({
      where: { id: policyVersionId },
      data: {
        version: body.version ?? undefined,
        effective_at: body.effective_at ?? undefined,
        expires_at: body.expires_at ?? undefined,
        title: body.title ?? undefined,
        document_uri: body.document_uri ?? undefined,
        document_hash: body.document_hash ?? undefined,
        updated_at: toISOStringSafe(new Date()),
      },
    });

  // Return all fields as required by API contract (immutably, never mutating old values)
  return {
    id: updated.id,
    organization_id: updated.organization_id,
    policy_type: updated.policy_type,
    version: updated.version,
    effective_at: toISOStringSafe(updated.effective_at),
    expires_at:
      updated.expires_at === null || updated.expires_at === undefined
        ? null
        : toISOStringSafe(updated.expires_at),
    title: updated.title,
    document_uri: updated.document_uri,
    document_hash: updated.document_hash ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null || updated.deleted_at === undefined
        ? null
        : toISOStringSafe(updated.deleted_at),
  };
}
