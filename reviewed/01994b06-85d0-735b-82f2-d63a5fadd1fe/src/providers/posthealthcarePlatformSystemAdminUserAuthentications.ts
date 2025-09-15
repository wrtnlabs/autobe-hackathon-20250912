import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformUserAuthentication } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformUserAuthentication";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Create a new user authentication credential record
 * (healthcare_platform_user_authentications).
 *
 * This endpoint creates a user authentication credential for a systemadmin,
 * supporting local or federated providers. It enforces business validation:
 * only allowed providers are accepted, referenced user must exist and be
 * active, and uniqueness is enforced at the (user_type, provider, provider_key)
 * level. Sensitive fields (password_hash) are never exposed in the API
 * response. All audit fields (created_at, updated_at) are recorded as ISO
 * date-time strings. Returns the full authentication record on success (minus
 * password_hash), or throws with a clear error if validation fails.
 *
 * @param props - Input props containing system admin context and body
 * @param props.systemAdmin - Authenticated SystemadminPayload (validated by
 *   auth middleware)
 * @param props.body - Body with user_id, user_type, provider, provider_key, and
 *   optional password_hash
 * @returns IHealthcarePlatformUserAuthentication (excluding password hash)
 * @throws {Error} If provider is invalid, user does not exist, user_type is
 *   unsupported, or record already exists
 */
export async function posthealthcarePlatformSystemAdminUserAuthentications(props: {
  systemAdmin: SystemadminPayload;
  body: IHealthcarePlatformUserAuthentication.ICreate;
}): Promise<IHealthcarePlatformUserAuthentication> {
  const { systemAdmin, body } = props;

  // Only these providers are allowed by business policy
  const allowedProviders = ["local", "saml", "oauth2", "ad"];
  if (allowedProviders.indexOf(body.provider) === -1) {
    throw new Error("Invalid authentication provider");
  }

  // Step 1: Validate the referenced user exists and is not deleted
  // (In this implementation we only support systemadmin user_type; extend as requirements expand)
  if (body.user_type !== "systemadmin") {
    throw new Error("Only user_type 'systemadmin' is supported");
  }
  const user = await MyGlobal.prisma.healthcare_platform_systemadmins.findFirst(
    {
      where: {
        id: body.user_id,
        deleted_at: null,
      },
    },
  );
  if (!user) {
    throw new Error("Referenced user does not exist or is not active");
  }

  // Step 2: Enforce uniqueness on (user_type, provider, provider_key)
  const duplicate =
    await MyGlobal.prisma.healthcare_platform_user_authentications.findFirst({
      where: {
        user_type: body.user_type,
        provider: body.provider,
        provider_key: body.provider_key,
        deleted_at: null,
      },
    });
  if (duplicate) {
    throw new Error(
      "Authentication record already exists for this user, provider, and provider_key",
    );
  }

  // Step 3: Create the authentication record
  const now = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.healthcare_platform_user_authentications.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        user_id: body.user_id,
        user_type: body.user_type,
        provider: body.provider,
        provider_key: body.provider_key,
        password_hash: body.password_hash ?? undefined,
        created_at: now,
        updated_at: now,
        deleted_at: null,
        last_authenticated_at: null,
      },
    });

  // Step 4: Return API record (password_hash must NEVER be present)
  // Handle all date/datetime as string & tags.Format<'date-time'>
  // Nullables for deleted_at/last_authenticated_at use undefined if not present, to match API signature
  const result: IHealthcarePlatformUserAuthentication = {
    id: created.id,
    user_id: created.user_id,
    user_type: created.user_type,
    provider: created.provider,
    provider_key: created.provider_key,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at != null
        ? toISOStringSafe(created.deleted_at)
        : undefined,
    last_authenticated_at:
      created.last_authenticated_at != null
        ? toISOStringSafe(created.last_authenticated_at)
        : undefined,
  };
  return result;
}
