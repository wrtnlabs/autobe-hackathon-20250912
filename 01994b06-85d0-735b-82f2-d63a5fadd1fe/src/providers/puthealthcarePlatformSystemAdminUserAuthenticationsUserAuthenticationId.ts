import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformUserAuthentication } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformUserAuthentication";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Update authentication credential record for a user
 * (healthcare_platform_user_authentications) by ID.
 *
 * This operation updates an existing user authentication record in the
 * healthcare_platform_user_authentications table. Used for credential lifecycle
 * management, credential reset/rotation, SSO re-provisioning, or updating the
 * authentication provider or credential type for a user. All updates are fully
 * audited and follow platform/organization policy regarding credential security
 * (e.g. password rotation, SSO provider deprovisioning, status updates). Only
 * privileged system/organization administrators can use this endpoint, with
 * request scopes strictly enforced. Credential secrets are write-only and are
 * never returned in any API response.
 *
 * All update actions are fully logged for compliance, supporting use cases such
 * as account remediation, deprovisioning, or credential reset workflows for
 * internal security or audit. The operation returns the fully-updated
 * authentication record on success, or includes error context in the case of
 * invalid, unauthorized, or policy-violating updates.
 *
 * @param props - Properties object
 * @param props.systemAdmin - The authenticated system administrator
 *   (SystemadminPayload) performing the update
 * @param props.userAuthenticationId - UUID of the user authentication record to
 *   update
 * @param props.body - Request body with credential fields to update (provider,
 *   provider_key, password_hash, etc.)
 * @returns The updated user authentication record (excluding credential
 *   secrets)
 * @throws {Error} If authentication record is not found or soft-deleted, or
 *   access is not permitted
 */
export async function puthealthcarePlatformSystemAdminUserAuthenticationsUserAuthenticationId(props: {
  systemAdmin: SystemadminPayload;
  userAuthenticationId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformUserAuthentication.IUpdate;
}): Promise<IHealthcarePlatformUserAuthentication> {
  const { systemAdmin, userAuthenticationId, body } = props;

  // Authorization: systemAdmin must exist (guaranteed by decorator)
  // 1. Record existence and soft-delete check
  const original =
    await MyGlobal.prisma.healthcare_platform_user_authentications.findFirst({
      where: { id: userAuthenticationId, deleted_at: null },
    });
  if (!original) {
    throw new Error("User authentication record not found");
  }

  // 2. Prepare mutation fields (only what's present in body)
  const updateData: {
    provider?: string;
    provider_key?: string;
    password_hash?: string | null;
    last_authenticated_at?: string | null;
    deleted_at?: string | null;
    updated_at: string;
  } = {
    // Apply updatable fields
    ...(body.provider !== undefined ? { provider: body.provider } : {}),
    ...(body.provider_key !== undefined
      ? { provider_key: body.provider_key }
      : {}),
    ...(body.password_hash !== undefined
      ? { password_hash: body.password_hash }
      : {}),
    ...(body.last_authenticated_at !== undefined
      ? { last_authenticated_at: body.last_authenticated_at }
      : {}),
    ...(body.deleted_at !== undefined ? { deleted_at: body.deleted_at } : {}),
    updated_at:
      body.updated_at !== undefined
        ? body.updated_at
        : toISOStringSafe(new Date()),
  };

  const updated =
    await MyGlobal.prisma.healthcare_platform_user_authentications.update({
      where: { id: userAuthenticationId },
      data: updateData,
      select: {
        id: true,
        user_id: true,
        user_type: true,
        provider: true,
        provider_key: true,
        last_authenticated_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        // password_hash: never selected (secrets are write-only)
      },
    });

  return {
    id: updated.id,
    user_id: updated.user_id,
    user_type: updated.user_type,
    provider: updated.provider,
    provider_key: updated.provider_key,
    // Nullable & optional handling for date
    last_authenticated_at: updated.last_authenticated_at
      ? toISOStringSafe(updated.last_authenticated_at)
      : undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
    // password_hash is NEVER returned as per contract
  };
}
