import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingModerator";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

/**
 * Get detailed moderator information by ID
 *
 * Retrieves detailed information of a specific moderator user identified by
 * their unique UUID. Accesses the recipe_sharing_moderators table to obtain
 * email, username, password hash, and audit timestamps including created_at,
 * updated_at, and optionally deleted_at.
 *
 * @param props - Object containing the authenticated moderator and target
 *   moderator ID.
 * @param props.moderator - The authenticated moderator performing the request.
 * @param props.id - The UUID of the moderator user to retrieve.
 * @returns The full moderator details conforming to IRecipeSharingModerator
 *   structure.
 * @throws {Error} Throws if the moderator with specified ID does not exist.
 */
export async function getrecipeSharingModeratorModeratorsId(props: {
  moderator: ModeratorPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IRecipeSharingModerator> {
  const { id } = props;

  const moderator =
    await MyGlobal.prisma.recipe_sharing_moderators.findUniqueOrThrow({
      where: { id },
      select: {
        id: true,
        email: true,
        password_hash: true,
        username: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });

  return {
    id: moderator.id,
    email: moderator.email,
    password_hash: moderator.password_hash,
    username: moderator.username,
    created_at: toISOStringSafe(moderator.created_at),
    updated_at: toISOStringSafe(moderator.updated_at),
    deleted_at: moderator.deleted_at
      ? toISOStringSafe(moderator.deleted_at)
      : null,
  };
}
