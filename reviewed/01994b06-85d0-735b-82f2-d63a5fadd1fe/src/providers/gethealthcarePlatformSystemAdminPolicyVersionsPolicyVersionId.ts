import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformPolicyVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPolicyVersion";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Fetch detailed information about a specific healthcare policy version entity
 * from healthcare_platform_policy_versions.
 *
 * This operation retrieves the comprehensive details for a specific policy
 * version using its unique identifier. The policy version record includes type,
 * version label, effective/expiration dates, document URI/hash, and metadata
 * for compliance and workflow audits.
 *
 * Access is granted to authenticated system administrators. The function throws
 * if no matching policy version is found. All date and timestamp fields are
 * correctly converted using toISOStringSafe. Optional/nullable fields are
 * handled per type.
 *
 * @param props - Request properties
 * @param props.systemAdmin - The authenticated Systemadmin making the API call
 * @param props.policyVersionId - Unique identifier (UUID) of the policy version
 *   to retrieve
 * @returns Complete IHealthcarePlatformPolicyVersion record with all details
 *   and metadata
 * @throws {Error} When the policy version does not exist
 */
export async function gethealthcarePlatformSystemAdminPolicyVersionsPolicyVersionId(props: {
  systemAdmin: SystemadminPayload;
  policyVersionId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformPolicyVersion> {
  const { policyVersionId } = props;
  const record =
    await MyGlobal.prisma.healthcare_platform_policy_versions.findUniqueOrThrow(
      {
        where: { id: policyVersionId },
        select: {
          id: true,
          organization_id: true,
          policy_type: true,
          version: true,
          effective_at: true,
          expires_at: true,
          title: true,
          document_uri: true,
          document_hash: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    );
  return {
    id: record.id,
    organization_id: record.organization_id,
    policy_type: record.policy_type,
    version: record.version,
    effective_at: toISOStringSafe(record.effective_at),
    expires_at: record.expires_at ? toISOStringSafe(record.expires_at) : null,
    title: record.title,
    document_uri: record.document_uri,
    document_hash: record.document_hash ?? undefined,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at
      ? toISOStringSafe(record.deleted_at)
      : undefined,
  };
}
