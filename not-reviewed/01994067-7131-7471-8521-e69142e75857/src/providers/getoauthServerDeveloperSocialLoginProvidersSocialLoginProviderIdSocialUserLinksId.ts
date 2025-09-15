import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerSocialUserLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerSocialUserLink";
import { DeveloperPayload } from "../decorators/payload/DeveloperPayload";

/**
 * Get detailed social user link information
 *
 * Fetch detailed information of a single social user link by ID under the
 * specified social login provider. Access restricted to users with the
 * "developer" role. This operation reads from `oauth_server_social_user_links`
 * table. Provides comprehensive data about the linkage between internal user
 * accounts and external social provider identities. Useful for auditing,
 * troubleshooting, or management of social login associations.
 *
 * @param props - Request properties
 * @param props.developer - The authenticated developer making the request
 * @param props.socialLoginProviderId - Target social login provider's UUID
 * @param props.id - Target social user link's UUID
 * @returns Detailed social user link entity
 * @throws {Error} When the social user link is not found or soft deleted
 */
export async function getoauthServerDeveloperSocialLoginProvidersSocialLoginProviderIdSocialUserLinksId(props: {
  developer: DeveloperPayload;
  socialLoginProviderId: string & tags.Format<"uuid">;
  id: string & tags.Format<"uuid">;
}): Promise<IOauthServerSocialUserLink> {
  const record =
    await MyGlobal.prisma.oauth_server_social_user_links.findFirstOrThrow({
      where: {
        id: props.id,
        social_provider_id: props.socialLoginProviderId,
        deleted_at: null,
      },
    });

  return {
    id: record.id,
    user_id: record.user_id,
    social_provider_id: record.social_provider_id,
    external_user_id: record.external_user_id,
    access_token: record.access_token ?? undefined,
    refresh_token: record.refresh_token ?? undefined,
    token_expiry: record.token_expiry
      ? toISOStringSafe(record.token_expiry)
      : undefined,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at
      ? toISOStringSafe(record.deleted_at)
      : undefined,
  };
}
