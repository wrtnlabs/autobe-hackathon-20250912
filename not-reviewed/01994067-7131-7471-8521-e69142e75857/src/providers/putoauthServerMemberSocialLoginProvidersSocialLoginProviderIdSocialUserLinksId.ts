import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerSocialUserLinks } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerSocialUserLinks";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Updates an existing social user link record for the specified social login
 * provider and link ID.
 *
 * Ensures that the authenticated member owns the social user link before
 * allowing updates. Updates external user ID, OAuth tokens, token expiry, and
 * timestamps.
 *
 * @param props - Contains member authentication info, socialLoginProviderId,
 *   link ID, and update data
 * @returns The updated social user link record with updated timestamps
 * @throws {Error} If the social user link does not belong to the authenticated
 *   member or is not found
 */
export async function putoauthServerMemberSocialLoginProvidersSocialLoginProviderIdSocialUserLinksId(props: {
  member: MemberPayload;
  socialLoginProviderId: string & tags.Format<"uuid">;
  id: string & tags.Format<"uuid">;
  body: IOauthServerSocialUserLinks.IUpdate;
}): Promise<IOauthServerSocialUserLinks> {
  const { member, socialLoginProviderId, id, body } = props;

  // Fetch existing record
  const existing =
    await MyGlobal.prisma.oauth_server_social_user_links.findFirstOrThrow({
      where: {
        id,
        social_provider_id: socialLoginProviderId,
      },
    });

  // Authorization check: must belong to member
  if (existing.user_id !== member.id) {
    throw new Error(
      "Unauthorized access: member does not own the social user link",
    );
  }

  // Prepare current timestamp
  const now = toISOStringSafe(new Date());

  // Update record
  const updated = await MyGlobal.prisma.oauth_server_social_user_links.update({
    where: { id },
    data: {
      user_id: body.user_id === null ? null : (body.user_id ?? undefined),
      social_provider_id:
        body.social_provider_id === null
          ? null
          : (body.social_provider_id ?? undefined),
      external_user_id:
        body.external_user_id === null
          ? null
          : (body.external_user_id ?? undefined),
      access_token:
        body.access_token === undefined
          ? undefined
          : body.access_token === null
            ? null
            : body.access_token,
      refresh_token:
        body.refresh_token === undefined
          ? undefined
          : body.refresh_token === null
            ? null
            : body.refresh_token,
      token_expiry:
        body.token_expiry === undefined
          ? undefined
          : body.token_expiry === null
            ? null
            : body.token_expiry,
      updated_at: now,
    },
  });

  // Return updated record with all dates as ISO strings
  return {
    id: updated.id,
    user_id: updated.user_id,
    social_provider_id: updated.social_provider_id,
    external_user_id: updated.external_user_id,
    access_token: updated.access_token ?? null,
    refresh_token: updated.refresh_token ?? null,
    token_expiry: updated.token_expiry
      ? toISOStringSafe(updated.token_expiry)
      : null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
