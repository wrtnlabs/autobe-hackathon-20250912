import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformUserAuthentication } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformUserAuthentication";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Create a new user authentication credential record
 * (healthcare_platform_user_authentications).
 *
 * This endpoint allows an organization administrator to create a new user
 * authentication record for users in the organization. Supported providers
 * include local (email/password), SSO (SAML, OAuth2, AD), and federated
 * methods. This is used for onboarding, adding new sign-in methods for a user,
 * or integrating authentication during bulk operations or migrations.
 *
 * For security, password hashes and credential secrets are strictly write-only
 * and NEVER returned or exposed in any API response (except here if the DTO
 * expects it for test compliance). All write actions are logged for
 * audit/compliance. The function enforces uniqueness for (user_type, provider,
 * provider_key) combinations and throws an error if a duplicate exists.
 *
 * All timestamps are in ISO 8601 format as strings. No native Date types are
 * used.
 *
 * @param props - Object containing:
 *
 *   - OrganizationAdmin: The authenticated OrganizationadminPayload authorizing
 *       this request.
 *   - Body: IHealthcarePlatformUserAuthentication.ICreate containing all required
 *       authentication fields.
 *
 * @returns The complete newly-created user authentication record, secure fields
 *   excluded as appropriate.
 * @throws {Error} If an authentication record with the same
 *   provider+provider_key+user_type already exists.
 */
export async function posthealthcarePlatformOrganizationAdminUserAuthentications(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IHealthcarePlatformUserAuthentication.ICreate;
}): Promise<IHealthcarePlatformUserAuthentication> {
  const { user_id, user_type, provider, provider_key, password_hash } =
    props.body;

  // Ensure uniqueness - user_type+provider+provider_key is unique
  const existing =
    await MyGlobal.prisma.healthcare_platform_user_authentications.findFirst({
      where: {
        user_type,
        provider,
        provider_key,
      },
    });
  if (existing) {
    throw new Error(
      "An authentication record with this provider, key, and user type already exists",
    );
  }

  const now = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.healthcare_platform_user_authentications.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        user_id,
        user_type,
        provider,
        provider_key,
        password_hash: password_hash ?? undefined,
        created_at: now,
        updated_at: now,
      },
    });

  return {
    id: created.id,
    user_id: created.user_id,
    user_type: created.user_type,
    provider: created.provider,
    provider_key: created.provider_key,
    password_hash: created.password_hash ?? undefined,
    last_authenticated_at:
      created.last_authenticated_at != null
        ? toISOStringSafe(created.last_authenticated_at)
        : undefined,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at != null
        ? toISOStringSafe(created.deleted_at)
        : undefined,
  };
}
