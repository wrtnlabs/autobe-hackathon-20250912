import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingModerator";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

/**
 * Update a moderator user's information by their unique ID.
 *
 * This operation updates email, username, password_hash, and optionally the
 * deleted_at timestamp. Only a moderator can perform this operation.
 *
 * @param props - Object containing the authenticated moderator, target
 *   moderator id, and update body.
 * @param props.moderator - The authenticated moderator performing the update.
 * @param props.id - UUID of the moderator to update.
 * @param props.body - Partial update data for the moderator.
 * @returns The updated moderator user information.
 * @throws {Error} When the specified moderator ID does not exist.
 */
export async function putrecipeSharingModeratorModeratorsId(props: {
  moderator: ModeratorPayload;
  id: string & tags.Format<"uuid">;
  body: IRecipeSharingModerator.IUpdate;
}): Promise<IRecipeSharingModerator> {
  const { moderator, id, body } = props;

  // Verify that the moderator exists
  const existing = await MyGlobal.prisma.recipe_sharing_moderators.findUnique({
    where: { id },
  });
  if (!existing) throw new Error(`Moderator with id ${id} not found`);

  // Update the moderator user with provided fields
  const updated = await MyGlobal.prisma.recipe_sharing_moderators.update({
    where: { id },
    data: {
      email: body.email ?? undefined,
      password_hash: body.password_hash ?? undefined,
      username: body.username ?? undefined,
      deleted_at: body.deleted_at === undefined ? undefined : body.deleted_at,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Convert DateTime fields to ISO strings and return
  return {
    id: updated.id,
    email: updated.email,
    password_hash: updated.password_hash,
    username: updated.username,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
