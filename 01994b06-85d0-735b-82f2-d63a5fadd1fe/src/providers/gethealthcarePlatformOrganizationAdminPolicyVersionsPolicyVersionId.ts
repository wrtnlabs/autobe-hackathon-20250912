import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformPolicyVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPolicyVersion";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Fetch detailed information about a specific healthcare policy version entity
 * from healthcare_platform_policy_versions.
 *
 * This operation retrieves all compliance, audit, and workflow metadata for a
 * policy version by UUID. It is used by organization administrators and
 * compliance staff for legal review and evidentiary reporting, and ensures
 * tenant isolation by requiring a valid OrganizationadminPayload. Soft-deleted
 * records are omitted from results, and all temporal fields are normalized to
 * ISO 8601 format matching the API contract. Nullable and optional fields are
 * mapped according to schema.
 *
 * @param props - The request props
 * @param props.organizationAdmin - Authenticated organization admin payload
 * @param props.policyVersionId - Unique identifier of the policy version to
 *   fetch
 * @returns The full policy version with document metadata and versioning
 *   details
 * @throws {Error} If no matching policy version exists or is deleted
 */
export async function gethealthcarePlatformOrganizationAdminPolicyVersionsPolicyVersionId(props: {
  organizationAdmin: OrganizationadminPayload;
  policyVersionId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformPolicyVersion> {
  const { policyVersionId } = props;
  const found =
    await MyGlobal.prisma.healthcare_platform_policy_versions.findFirst({
      where: {
        id: policyVersionId,
        deleted_at: null,
      },
    });
  if (!found) throw new Error("Policy version not found or deleted");
  return {
    id: found.id,
    organization_id: found.organization_id,
    policy_type: found.policy_type,
    version: found.version,
    effective_at: toISOStringSafe(found.effective_at),
    expires_at: found.expires_at ? toISOStringSafe(found.expires_at) : null,
    title: found.title,
    document_uri: found.document_uri,
    document_hash:
      found.document_hash !== undefined && found.document_hash !== null
        ? found.document_hash
        : undefined,
    created_at: toISOStringSafe(found.created_at),
    updated_at: toISOStringSafe(found.updated_at),
    deleted_at: found.deleted_at ? toISOStringSafe(found.deleted_at) : null,
  };
}
