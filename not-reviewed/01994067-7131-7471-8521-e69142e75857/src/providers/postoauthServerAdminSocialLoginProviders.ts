import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerSocialProviders } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerSocialProviders";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Creates a new social login provider configuration.
 *
 * This endpoint allows administrators to add new OAuth social login providers
 * by specifying their client ID, secret, authorization and token endpoints,
 * user info URL, scopes, and activation status.
 *
 * Because this operation affects external authentication flows and includes
 * sensitive credentials, it requires administrator authorization.
 *
 * @param props - Request properties containing admin payload and creation body
 * @param props.admin - The authenticated admin performing the operation
 * @param props.body - Social login provider creation details
 * @returns The newly created social login provider record with timestamps and
 *   identifiers
 * @throws {Error} Throws if the creation fails due to Prisma or validation
 *   errors
 */
export async function postoauthServerAdminSocialLoginProviders(props: {
  admin: AdminPayload;
  body: IOauthServerSocialProviders.ICreate;
}): Promise<IOauthServerSocialProviders> {
  const { admin, body } = props;

  const now = toISOStringSafe(new Date());
  const id = v4() as string & tags.Format<"uuid">;

  const created = await MyGlobal.prisma.oauth_server_social_providers.create({
    data: {
      id,
      provider_name: body.provider_name,
      client_id: body.client_id,
      client_secret: body.client_secret,
      auth_url: body.auth_url,
      token_url: body.token_url,
      user_info_url: body.user_info_url,
      scopes: body.scopes ?? null,
      is_active: body.is_active,
      deleted_at: null,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id,
    provider_name: created.provider_name,
    client_id: created.client_id,
    client_secret: created.client_secret,
    auth_url: created.auth_url,
    token_url: created.token_url,
    user_info_url: created.user_info_url,
    scopes: created.scopes ?? null,
    is_active: created.is_active,
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
