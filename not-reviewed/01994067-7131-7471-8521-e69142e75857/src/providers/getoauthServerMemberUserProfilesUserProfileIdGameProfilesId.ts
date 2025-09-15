import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerUserGameProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerUserGameProfile";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Retrieves detailed information of a specific game profile linked to a user
 * profile.
 *
 * This function enforces strict authorization, ensuring the requesting member
 * owns the user profile. It fetches the game profile only if it exists and is
 * not soft deleted.
 *
 * @param props - The parameters including member payload, user profile ID, and
 *   game profile ID.
 * @returns The detailed game profile information conforming to
 *   IOauthServerUserGameProfile.
 * @throws {Error} If authorization fails or game profile is not found.
 */
export async function getoauthServerMemberUserProfilesUserProfileIdGameProfilesId(props: {
  member: MemberPayload;
  userProfileId: string & tags.Format<"uuid">;
  id: string & tags.Format<"uuid">;
}): Promise<IOauthServerUserGameProfile> {
  const { member, userProfileId, id } = props;

  // Authorization check: confirm user profile belongs to member
  const userProfile =
    await MyGlobal.prisma.oauth_server_user_profiles.findFirst({
      where: {
        id: userProfileId,
        user_id: member.id,
        deleted_at: null,
      },
    });

  if (!userProfile) {
    throw new Error(
      "Unauthorized access: user profile does not belong to the member",
    );
  }

  // Fetch game profile by id and user_profile_id, excluding soft deleted
  const gameProfile =
    await MyGlobal.prisma.oauth_server_game_profiles.findFirst({
      where: {
        id,
        user_profile_id: userProfileId,
        deleted_at: null,
      },
    });

  if (!gameProfile) {
    throw new Error("Game profile not found");
  }

  // Return data with date fields converted to ISO string with proper branding
  return {
    id: gameProfile.id,
    user_profile_id: gameProfile.user_profile_id,
    platform: gameProfile.platform,
    player_name: gameProfile.player_name,
    season: gameProfile.season ?? undefined,
    created_at: toISOStringSafe(gameProfile.created_at),
    updated_at: toISOStringSafe(gameProfile.updated_at),
    deleted_at: gameProfile.deleted_at
      ? toISOStringSafe(gameProfile.deleted_at)
      : null,
  };
}
