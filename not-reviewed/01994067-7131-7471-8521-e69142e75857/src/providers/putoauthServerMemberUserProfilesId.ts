import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerUserProfile";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Update user profile details by profile ID.
 *
 * Allows modification of optional user profile fields (nickname, profile
 * picture URL, biography). Only non-deleted profiles (deleted_at is null) can
 * be updated.
 *
 * Authorization ensures the authenticated member owns the profile.
 *
 * @param props - Object containing member payload, profile ID, and update body
 * @returns Updated user profile details
 * @throws {Error} Throws if profile does not exist, is soft-deleted, or
 *   unauthorized
 */
export async function putoauthServerMemberUserProfilesId(props: {
  member: MemberPayload;
  id: string & tags.Format<"uuid">;
  body: IOauthServerUserProfile.IUpdate;
}): Promise<IOauthServerUserProfile> {
  const { member, id, body } = props;

  // Fetch the user profile and ensure it exists and not soft deleted
  const profile =
    await MyGlobal.prisma.oauth_server_user_profiles.findUniqueOrThrow({
      where: {
        id,
        deleted_at: null,
      },
    });

  // Authorization check: user can only update own profile
  if (profile.user_id !== member.id) {
    throw new Error("Unauthorized: Cannot update other user's profile");
  }

  const updatedAt = toISOStringSafe(new Date());

  // Build update data selectively based on provided fields
  const data = {
    ...(body.nickname !== undefined ? { nickname: body.nickname } : {}),
    ...(body.profile_picture_url !== undefined
      ? { profile_picture_url: body.profile_picture_url }
      : {}),
    ...(body.biography !== undefined ? { biography: body.biography } : {}),
    updated_at: updatedAt,
  };

  // Update record
  const updated = await MyGlobal.prisma.oauth_server_user_profiles.update({
    where: { id },
    data,
  });

  // Return updated profile with date fields converted as ISO strings
  return {
    id: updated.id,
    user_id: updated.user_id,
    nickname: updated.nickname ?? null,
    profile_picture_url: updated.profile_picture_url ?? null,
    biography: updated.biography ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
