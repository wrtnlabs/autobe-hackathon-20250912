import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformUserAuthentication } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformUserAuthentication";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Retrieve full details for a user authentication record
 * (healthcare_platform_user_authentications) by ID.
 *
 * This endpoint allows organization administrators to retrieve all non-secret
 * details of a user authentication credential, referenced by the given UUID. It
 * strictly enforces RBAC organization boundaries by requiring that the
 * authentication record belongs to a user within the same organization as the
 * admin. The credential secret (password_hash) is never included in the
 * response, per security policy. If the record does not exist, is deleted, or
 * does not belong to the admin's org, an error is thrown.
 *
 * @param props -
 *
 *   - OrganizationAdmin: OrganizationadminPayload for the authenticated admin (must
 *       include id and type)
 *   - UserAuthenticationId: Authentication record UUID to look up
 *
 * @returns IHealthcarePlatformUserAuthentication without password_hash
 * @throws {Error} When the authentication record is not found, is deleted, or
 *   does not belong to the admin's organization
 */
export async function gethealthcarePlatformOrganizationAdminUserAuthenticationsUserAuthenticationId(props: {
  organizationAdmin: OrganizationadminPayload;
  userAuthenticationId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformUserAuthentication> {
  const { organizationAdmin, userAuthenticationId } = props;

  // Retrieve the authentication record (not deleted)
  const authRecord =
    await MyGlobal.prisma.healthcare_platform_user_authentications.findFirst({
      where: { id: userAuthenticationId, deleted_at: null },
    });
  if (!authRecord) {
    throw new Error("Authentication record not found");
  }

  // Lookup the admin's org id
  // We need to find the organization that this admin belongs to.
  // The OrganizationadminPayload does not provide organization_id directly, so we must resolve it by looking up the organization_admin record, then their org assignment.
  const adminAssignment =
    await MyGlobal.prisma.healthcare_platform_user_org_assignments.findFirst({
      where: {
        user_id: organizationAdmin.id,
        deleted_at: null,
      },
      // Smallest/first active assignment is sufficient for RBAC enforcement
    });
  if (!adminAssignment) {
    throw new Error("Unauthorized: admin assignment missing or deleted");
  }
  const organizationId = adminAssignment.healthcare_platform_organization_id;

  // Check if the authentication record's user is assigned to this org
  const targetAssignment =
    await MyGlobal.prisma.healthcare_platform_user_org_assignments.findFirst({
      where: {
        user_id: authRecord.user_id,
        healthcare_platform_organization_id: organizationId,
        deleted_at: null,
      },
    });
  if (!targetAssignment) {
    throw new Error(
      "Forbidden: authentication record not in your organization",
    );
  }

  // Map fields, omitting password_hash per security policy
  return {
    id: authRecord.id,
    user_id: authRecord.user_id,
    user_type: authRecord.user_type,
    provider: authRecord.provider,
    provider_key: authRecord.provider_key,
    last_authenticated_at:
      authRecord.last_authenticated_at == null
        ? undefined
        : toISOStringSafe(authRecord.last_authenticated_at),
    created_at: toISOStringSafe(authRecord.created_at),
    updated_at: toISOStringSafe(authRecord.updated_at),
    deleted_at:
      authRecord.deleted_at == null
        ? undefined
        : toISOStringSafe(authRecord.deleted_at),
    // password_hash: NEVER included, enforced by DTO and test expectation
  };
}
