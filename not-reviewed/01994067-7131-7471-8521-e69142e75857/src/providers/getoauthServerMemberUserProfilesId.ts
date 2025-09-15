import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerUserProfile";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Retrieve user profile details by ID
 *
 * This operation fetches a user profile by its unique identifier from the OAuth
 * server system. It retrieves frequently changing user profile metadata such as
 * nickname, profile picture URL, and biography. Only active profiles are
 * returned; soft-deleted profiles (where deleted_at is non-null) are excluded.
 *
 * Authorization is enforced by the member authentication payload to ensure only
 * authorized access.
 *
 * @param props - Object containing member authentication payload and user
 *   profile ID
 * @param props.member - Authenticated member payload granting access rights
 * @param props.id - Unique UUID of the user profile to retrieve
 * @returns User profile detailed information matching IOauthServerUserProfile
 * @throws {Error} Throws if no active user profile matched or unauthorized
 *   access
 */
export async function getoauthServerMemberUserProfilesId(props: {
  member: MemberPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IOauthServerUserProfile> {
  const { member, id } = props;

  const profile =
    await MyGlobal.prisma.oauth_server_user_profiles.findFirstOrThrow({
      where: {
        id: id,
        deleted_at: null,
      },
    });

  return {
    id: profile.id,
    user_id: profile.user_id,
    nickname: profile.nickname ?? undefined,
    profile_picture_url: profile.profile_picture_url ?? undefined,
    biography: profile.biography ?? undefined,
    created_at: toISOStringSafe(profile.created_at),
    updated_at: toISOStringSafe(profile.updated_at),
    deleted_at: profile.deleted_at ? toISOStringSafe(profile.deleted_at) : null,
  };
}
