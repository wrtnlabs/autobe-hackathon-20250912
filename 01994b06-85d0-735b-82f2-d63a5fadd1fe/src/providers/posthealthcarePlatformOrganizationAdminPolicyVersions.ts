import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformPolicyVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPolicyVersion";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Create a new policy version entry in healthcare_platform_policy_versions for
 * compliance and legal management.
 *
 * This operation allows authorized compliance or administrative roles to create
 * a new policy version record within the healthcarePlatform. Each policy
 * version captures the details of a specific revision of a compliance, privacy,
 * or business policy (e.g., HIPAA, risk, retention) as legally required for
 * consent, audit, and governance functions. The operation persists a new row in
 * the healthcare_platform_policy_versions table, supporting all required
 * version control metadata, linkage to policy documents, organizational
 * context, effective/expire dates, and immutable versioning. It includes
 * business validation for uniqueness (per type/version/org) and correct
 * timestamp windows, and links to the full document URI and optional document
 * hash for tamper-proofing. All creation operations are auditable and
 * constrained by RBAC enforced according to tenant and compliance boundaries.
 *
 * Authorization: Only organization administrators (OrganizationadminPayload)
 * assigned to the target organization may perform this operation. All
 * permissions are enforced by verifying org admin assignment is active and not
 * soft-deleted.
 *
 * @param props - Operation properties
 * @param props.organizationAdmin - Authenticated organization admin making the
 *   request
 * @param props.body - Policy version creation parameters (see
 *   IHealthcarePlatformPolicyVersion.ICreate)
 * @returns Full persisted policy version record with all metadata and linkages
 * @throws {Error} When user is not an organization admin for the organization,
 *   or when the policy version already exists (uniqueness error), or when the
 *   effective/expiry date logic is invalid
 */
export async function posthealthcarePlatformOrganizationAdminPolicyVersions(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IHealthcarePlatformPolicyVersion.ICreate;
}): Promise<IHealthcarePlatformPolicyVersion> {
  const { organizationAdmin, body } = props;

  // 1. Authorization: verify the admin is assigned to the requested organization
  const orgAssignment =
    await MyGlobal.prisma.healthcare_platform_user_org_assignments.findFirst({
      where: {
        user_id: organizationAdmin.id,
        healthcare_platform_organization_id: body.organization_id,
        assignment_status: "active",
        deleted_at: null,
      },
    });
  if (!orgAssignment) {
    throw new Error(
      "You are not an active administrator for this organization or your assignment is not active.",
    );
  }

  // 2. Check uniqueness constraint: no non-deleted entry with same org/policy_type/version
  const existing =
    await MyGlobal.prisma.healthcare_platform_policy_versions.findFirst({
      where: {
        organization_id: body.organization_id,
        policy_type: body.policy_type,
        version: body.version,
        deleted_at: null,
      },
    });
  if (existing) {
    throw new Error(
      "A policy version with this type and version already exists for this organization.",
    );
  }

  // 3. Validate effective/expiry date logic if expires_at is given
  if (
    body.expires_at !== undefined &&
    body.expires_at !== null &&
    body.expires_at < body.effective_at
  ) {
    throw new Error("Policy expiration date cannot be before effective date.");
  }

  // 4. Create record (side effect: all required fields, no Date usage)
  const now = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.healthcare_platform_policy_versions.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        organization_id: body.organization_id,
        policy_type: body.policy_type,
        version: body.version,
        effective_at: body.effective_at,
        expires_at: body.expires_at ?? null,
        title: body.title,
        document_uri: body.document_uri,
        document_hash: body.document_hash ?? undefined,
        created_at: now,
        updated_at: now,
      },
    });

  // 5. Map to DTO output (all string or nullable as specified)
  return {
    id: created.id,
    organization_id: created.organization_id,
    policy_type: created.policy_type,
    version: created.version,
    effective_at: created.effective_at,
    expires_at: created.expires_at ?? null,
    title: created.title,
    document_uri: created.document_uri,
    document_hash: created.document_hash ?? undefined,
    created_at: created.created_at,
    updated_at: created.updated_at,
    deleted_at: created.deleted_at ?? null,
  };
}
