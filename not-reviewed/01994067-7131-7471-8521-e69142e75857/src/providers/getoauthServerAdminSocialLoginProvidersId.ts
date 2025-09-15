import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerSocialProviders } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerSocialProviders";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve detailed social login provider by ID
 *
 * This operation retrieves a social login provider configuration identified by
 * its unique ID. It returns all relevant fields including sensitive client
 * secrets and endpoint URLs, restricted to admins only.
 *
 * @param props - Object containing admin payload and social provider ID
 * @param props.admin - Authenticated admin user making the request
 * @param props.id - Unique ID of the social login provider
 * @returns Detailed social login provider information
 * @throws {Error} When provider not found or soft deleted
 */
export async function getoauthServerAdminSocialLoginProvidersId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IOauthServerSocialProviders> {
  const { admin, id } = props;

  // Fetch the social login provider where id matches and not soft deleted
  const provider =
    await MyGlobal.prisma.oauth_server_social_providers.findFirst({
      where: {
        id,
        deleted_at: null,
      },
    });

  if (provider === null) {
    throw new Error("Social login provider not found or deleted");
  }

  return {
    id: provider.id,
    provider_name: provider.provider_name,
    client_id: provider.client_id,
    client_secret: provider.client_secret,
    auth_url: provider.auth_url,
    token_url: provider.token_url,
    user_info_url: provider.user_info_url,
    scopes: provider.scopes ?? undefined,
    is_active: provider.is_active,
    created_at: toISOStringSafe(provider.created_at),
    updated_at: toISOStringSafe(provider.updated_at),
    deleted_at: provider.deleted_at
      ? toISOStringSafe(provider.deleted_at)
      : null,
  };
}
