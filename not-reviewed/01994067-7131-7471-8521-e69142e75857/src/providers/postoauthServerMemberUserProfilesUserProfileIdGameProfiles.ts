import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerUserGameProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerUserGameProfile";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Create a new user game profile.
 *
 * This operation creates a game profile linked to a specific user profile,
 * containing platform, player name, and optional season details. Only
 * authenticated members can perform this operation.
 *
 * @param props.member - The authenticated member making this request.
 * @param props.userProfileId - The UUID of the user profile to link the game
 *   profile.
 * @param props.body - The game profile creation data.
 * @returns The newly created user game profile.
 * @throws {Error} When the specified user profile does not exist.
 * @throws {Error} When the authenticated member does not own the user profile.
 */
export async function postoauthServerMemberUserProfilesUserProfileIdGameProfiles(props: {
  member: MemberPayload;
  userProfileId: string & tags.Format<"uuid">;
  body: IOauthServerUserGameProfile.ICreate;
}): Promise<IOauthServerUserGameProfile> {
  const { member, userProfileId, body } = props;

  // Verify the user profile exists and belongs to the member
  const userProfile =
    await MyGlobal.prisma.oauth_server_user_profiles.findUnique({
      where: { id: userProfileId },
    });

  if (!userProfile) {
    throw new Error("User profile not found");
  }

  if (userProfile.user_id !== member.id) {
    throw new Error("Unauthorized access to user profile");
  }

  // Prepare timestamps
  const now = toISOStringSafe(new Date());

  // Create the game profile
  const created = await MyGlobal.prisma.oauth_server_game_profiles.create({
    data: {
      id: v4(),
      user_profile_id: userProfileId,
      platform: body.platform,
      player_name: body.player_name,
      season: body.season ?? null,
      created_at: now,
      updated_at: now,
    },
  });

  // Return the newly created game profile data
  return {
    id: created.id,
    user_profile_id: created.user_profile_id,
    platform: created.platform,
    player_name: created.player_name,
    season: created.season === null ? null : created.season,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
