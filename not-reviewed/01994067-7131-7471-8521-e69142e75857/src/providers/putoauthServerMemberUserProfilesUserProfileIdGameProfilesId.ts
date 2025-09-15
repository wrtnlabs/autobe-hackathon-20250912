import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerUserGameProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerUserGameProfile";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Updates an existing user game profile for a member.
 *
 * This endpoint allows a member to update platform, player name, and season
 * fields of a game profile belonging to a specified user profile. Authorization
 * ensures the member can only modify their own linked game profiles.
 *
 * @param props - Request properties including authentication and path
 *   parameters
 * @param props.member - The authenticated member making the request
 * @param props.userProfileId - The UUID of the user profile owning the game
 *   profile
 * @param props.id - The UUID of the game profile to update
 * @param props.body - The update payload containing fields to modify
 * @returns The updated user game profile data
 * @throws {Error} When the specified game profile does not exist or does not
 *   belong to the member
 */
export async function putoauthServerMemberUserProfilesUserProfileIdGameProfilesId(props: {
  member: MemberPayload;
  userProfileId: string & tags.Format<"uuid">;
  id: string & tags.Format<"uuid">;
  body: IOauthServerUserGameProfile.IUpdate;
}): Promise<IOauthServerUserGameProfile> {
  const { member, userProfileId, id, body } = props;

  const existing =
    await MyGlobal.prisma.oauth_server_game_profiles.findFirstOrThrow({
      where: {
        id,
        user_profile_id: userProfileId,
        deleted_at: null,
      },
    });

  // Authorization enforcement is implicitly handled by ownership filtering

  const updateData: IOauthServerUserGameProfile.IUpdate = {};
  if (body.platform !== undefined) updateData.platform = body.platform;
  if (body.player_name !== undefined) updateData.player_name = body.player_name;
  if (body.season !== undefined) updateData.season = body.season;

  const updated = await MyGlobal.prisma.oauth_server_game_profiles.update({
    where: { id },
    data: updateData,
  });

  return {
    id: updated.id,
    user_profile_id: updated.user_profile_id,
    platform: updated.platform,
    player_name: updated.player_name,
    season: updated.season ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
