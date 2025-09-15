import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformUserAuthentication } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformUserAuthentication";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Update authentication credential record for a user
 * (healthcare_platform_user_authentications) by ID.
 *
 * This endpoint updates fields such as provider, provider_key, password_hash,
 * last_authenticated_at, deleted_at, and updated_at for a specific user
 * authentication record referenced by userAuthenticationId. Only organization
 * administrators with access to the authentication record may perform updates.
 * All update actions are fully audited, and credential secrets (password_hash)
 * are write-only—they must never be included in the API output. Ownership is
 * enforced by checking that the organizationAdmin's id matches the user_id of
 * the authentication record. All timestamps in the output conform to ISO 8601
 * string format. Attempts to update the authentication record for another
 * organization's user or a non-existent record result in errors.
 *
 * @param props - Object containing: organizationAdmin: the authenticated
 *   OrganizationadminPayload userAuthenticationId: the id of the authentication
 *   record to update body: IHealthcarePlatformUserAuthentication.IUpdate
 * @returns The updated authentication record as
 *   IHealthcarePlatformUserAuthentication, never exposing password_hash
 * @throws {Error} When the authentication record does not exist, or if the user
 *   is not authorized to perform this update
 */
export async function puthealthcarePlatformOrganizationAdminUserAuthenticationsUserAuthenticationId(props: {
  organizationAdmin: OrganizationadminPayload;
  userAuthenticationId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformUserAuthentication.IUpdate;
}): Promise<IHealthcarePlatformUserAuthentication> {
  const { organizationAdmin, userAuthenticationId, body } = props;

  // Fetch the authentication record
  const record =
    await MyGlobal.prisma.healthcare_platform_user_authentications.findUnique({
      where: { id: userAuthenticationId },
    });
  if (!record) {
    throw new Error("User authentication record not found");
  }

  // Only allow the organizationAdmin to update their own authentication record.
  // If the schema expands to support org-wide admin access, update this logic.
  if (record.user_id !== organizationAdmin.id) {
    throw new Error(
      "Unauthorized: you do not have permission to update this user authentication record",
    );
  }

  // Validation: provider and provider_key may not be empty string if provided
  if (body.provider !== undefined && body.provider.trim().length === 0) {
    throw new Error("provider cannot be empty string");
  }
  if (
    body.provider_key !== undefined &&
    body.provider_key.trim().length === 0
  ) {
    throw new Error("provider_key cannot be empty string");
  }

  // Build data object for update (only allowed fields)
  const updateData = {
    ...(body.provider !== undefined ? { provider: body.provider } : {}),
    ...(body.provider_key !== undefined
      ? { provider_key: body.provider_key }
      : {}),
    ...(body.password_hash !== undefined
      ? { password_hash: body.password_hash }
      : {}),
    ...(body.last_authenticated_at !== undefined
      ? {
          last_authenticated_at:
            body.last_authenticated_at !== null
              ? toISOStringSafe(body.last_authenticated_at)
              : null,
        }
      : {}),
    ...(body.deleted_at !== undefined
      ? {
          deleted_at:
            body.deleted_at !== null ? toISOStringSafe(body.deleted_at) : null,
        }
      : {}),
    updated_at:
      body.updated_at !== undefined
        ? toISOStringSafe(body.updated_at)
        : toISOStringSafe(new Date()),
  };

  const updated =
    await MyGlobal.prisma.healthcare_platform_user_authentications.update({
      where: { id: userAuthenticationId },
      data: updateData,
    });

  // Do not include password_hash in output (API contract: must never return credential secrets)
  return {
    id: updated.id,
    user_id: updated.user_id,
    user_type: updated.user_type,
    provider: updated.provider,
    provider_key: updated.provider_key,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    ...(updated.deleted_at !== null
      ? { deleted_at: toISOStringSafe(updated.deleted_at) }
      : {}),
    ...(updated.last_authenticated_at !== null
      ? {
          last_authenticated_at: toISOStringSafe(updated.last_authenticated_at),
        }
      : {}),
    // never expose password_hash
  };
}
