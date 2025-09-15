import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerSocialUserLinks } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerSocialUserLinks";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Create a social user link for a social login provider.
 *
 * This operation records the mapping between the internal OAuth server member
 * and the external social provider's user ID and tokens.
 *
 * Authorization: Only authenticated members can perform this action.
 *
 * @param props - Properties for the creation process
 * @param props.member - Authenticated member payload information
 * @param props.socialLoginProviderId - UUID of the social login provider from
 *   the path
 * @param props.body - Creation data for the social user link
 * @returns The created social user link record with all relevant fields
 * @throws {Error} When social_provider_id in body does not match path parameter
 */
export async function postoauthServerMemberSocialLoginProvidersSocialLoginProviderIdSocialUserLinks(props: {
  member: MemberPayload;
  socialLoginProviderId: string & tags.Format<"uuid">;
  body: IOauthServerSocialUserLinks.ICreate;
}): Promise<IOauthServerSocialUserLinks> {
  const { member, socialLoginProviderId, body } = props;

  if (body.social_provider_id !== socialLoginProviderId) {
    throw new Error(
      "social_provider_id in body does not match socialLoginProviderId parameter",
    );
  }

  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.oauth_server_social_user_links.create({
    data: {
      id: v4(),
      user_id: body.user_id,
      social_provider_id: socialLoginProviderId,
      external_user_id: body.external_user_id,
      access_token: body.access_token ?? null,
      refresh_token: body.refresh_token ?? null,
      token_expiry: body.token_expiry
        ? toISOStringSafe(body.token_expiry)
        : null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    user_id: created.user_id,
    social_provider_id: created.social_provider_id,
    external_user_id: created.external_user_id,
    access_token: created.access_token ?? null,
    refresh_token: created.refresh_token ?? null,
    token_expiry: created.token_expiry
      ? toISOStringSafe(created.token_expiry)
      : null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
