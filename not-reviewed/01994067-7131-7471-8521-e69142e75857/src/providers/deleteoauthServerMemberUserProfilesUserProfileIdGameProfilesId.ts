import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Deletes a user game profile record permanently by userProfileId and game
 * profile id.
 *
 * This operation requires an authenticated member user. It first validates
 * existence of the specified game profile linked to the given user profile. If
 * the record does not exist, it throws an error. Otherwise, it permanently
 * deletes the record.
 *
 * @param props - Object containing the member payload, userProfileId, and game
 *   profile id
 * @param props.member - Authenticated member user performing the deletion
 * @param props.userProfileId - UUID of the user profile
 * @param props.id - UUID of the game profile to delete
 * @returns Void
 * @throws {Error} When the specified game profile does not exist
 */
export async function deleteoauthServerMemberUserProfilesUserProfileIdGameProfilesId(props: {
  member: MemberPayload;
  userProfileId: string & tags.Format<"uuid">;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { member, userProfileId, id } = props;

  const gameProfile =
    await MyGlobal.prisma.oauth_server_game_profiles.findFirst({
      where: {
        id,
        user_profile_id: userProfileId,
      },
    });

  if (!gameProfile) throw new Error("Game profile not found");

  await MyGlobal.prisma.oauth_server_game_profiles.delete({
    where: { id },
  });
}
