import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Soft delete user profile by ID.
 *
 * This operation performs a soft delete on the user profile identified by the
 * given UUID. It sets the deleted_at timestamp to mark the profile as deleted
 * without physically removing it. Only the owner of the profile (authenticated
 * member) is authorized to perform this action.
 *
 * @param props - Object containing the authenticated member and the profile ID
 *   to delete
 * @param props.member - The authenticated member performing the deletion
 * @param props.id - The UUID of the user profile to soft delete
 * @throws {Error} When the profile does not exist or is already deleted
 * @throws {Error} When the authenticated member does not own the profile
 */
export async function deleteoauthServerMemberUserProfilesId(props: {
  member: MemberPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { member, id } = props;

  // Find the user profile that is not soft deleted
  const existingProfile =
    await MyGlobal.prisma.oauth_server_user_profiles.findFirst({
      where: {
        id,
        deleted_at: null,
      },
    });

  if (!existingProfile) {
    throw new Error("User profile not found or already deleted");
  }

  // Check that the authenticated member owns this profile
  if (existingProfile.user_id !== member.id) {
    throw new Error("Unauthorized: You can only delete your own user profile");
  }

  // Perform soft delete by setting deleted_at to current timestamp
  const deleted_at = toISOStringSafe(new Date());

  await MyGlobal.prisma.oauth_server_user_profiles.update({
    where: { id },
    data: { deleted_at },
  });
}
