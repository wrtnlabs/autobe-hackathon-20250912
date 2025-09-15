import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Delete a social user link by provider and link ID.
 *
 * This operation permanently removes the social user link record identified by
 * the given social login provider ID and link ID. Only the owner (member) of
 * the social user link can perform this deletion.
 *
 * @param props - Properties including the authenticated member, social login
 *   provider ID, and social user link ID to delete.
 * @throws {Error} When the social user link does not exist.
 * @throws {Error} When the authenticated member is not authorized to delete the
 *   link.
 */
export async function deleteoauthServerMemberSocialLoginProvidersSocialLoginProviderIdSocialUserLinksId(props: {
  member: MemberPayload;
  socialLoginProviderId: string & tags.Format<"uuid">;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { member, socialLoginProviderId, id } = props;

  const link = await MyGlobal.prisma.oauth_server_social_user_links.findFirst({
    where: {
      id,
      social_provider_id: socialLoginProviderId,
    },
    select: {
      user_id: true,
    },
  });

  if (!link) {
    throw new Error("Social user link not found");
  }

  if (link.user_id !== member.id) {
    throw new Error("Unauthorized: Cannot delete social user link");
  }

  await MyGlobal.prisma.oauth_server_social_user_links.delete({
    where: { id },
  });
}
