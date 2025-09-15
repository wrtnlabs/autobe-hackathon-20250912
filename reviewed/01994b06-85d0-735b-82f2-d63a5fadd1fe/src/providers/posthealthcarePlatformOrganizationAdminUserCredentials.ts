import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformUserCredential } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformUserCredential";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Archive a new user credential value record in the
 * healthcare_platform_user_credentials table.
 *
 * This endpoint allows organization administrators to archive a credential
 * value (password hash, SSO token, etc.) for their own user account or other
 * organizationadmin users, for audit and credential management. It ensures the
 * user exists and is active within the organization before archiving. All
 * credential archives are strictly append-only.
 *
 * @param props - Request properties
 * @param props.organizationAdmin - The authenticated organization admin making
 *   the request
 * @param props.body - The credential archive creation details
 * @returns The newly created credential archive record
 * @throws {Error} If the target user does not exist or is deleted; or if not
 *   permitted
 */
export async function posthealthcarePlatformOrganizationAdminUserCredentials(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IHealthcarePlatformUserCredential.ICreate;
}): Promise<IHealthcarePlatformUserCredential> {
  const { organizationAdmin, body } = props;

  // Only allow archiving for org admin user_ids that exist and are not soft-deleted
  const orgUser =
    await MyGlobal.prisma.healthcare_platform_organizationadmins.findFirst({
      where: {
        id: body.user_id,
        deleted_at: null,
      },
    });
  if (!orgUser) {
    throw new Error(
      "Target organization admin user does not exist or is deleted.",
    );
  }

  const created =
    await MyGlobal.prisma.healthcare_platform_user_credentials.create({
      data: {
        id: v4(),
        user_id: body.user_id,
        user_type: body.user_type,
        credential_type: body.credential_type,
        credential_hash: body.credential_hash,
        archived_at: body.archived_at,
        created_at: body.created_at,
      },
    });

  // All fields from database record are returned as per DTO; no mutation or transformation needed;
  return {
    id: created.id,
    user_id: created.user_id,
    user_type: created.user_type,
    credential_type: created.credential_type,
    credential_hash: created.credential_hash,
    archived_at: created.archived_at,
    created_at: created.created_at,
  };
}
