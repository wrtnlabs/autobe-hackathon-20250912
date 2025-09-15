import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingModeratorActions } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingModeratorActions";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

/**
 * Update an existing moderator action by its ID.
 *
 * Allows modification of action details and comments while preserving audit
 * compliance. Only authorized moderators can perform updates. The system
 * manages timestamps for creation and updates.
 *
 * @param props - Object containing moderator payload, ID to update, and update
 *   body
 * @returns The updated moderator action record
 * @throws {Error} If moderator is not authorized or inactive
 * @throws {Error} If the moderator action record with specified ID is not found
 */
export async function putrecipeSharingModeratorModeratorActionsId(props: {
  moderator: ModeratorPayload;
  id: string & tags.Format<"uuid">;
  body: IRecipeSharingModeratorActions.IUpdate;
}): Promise<IRecipeSharingModeratorActions> {
  const { moderator, id, body } = props;

  // Verify that the moderator exists and is active
  const existingModerator =
    await MyGlobal.prisma.recipe_sharing_moderators.findFirst({
      where: {
        id: moderator.id,
        deleted_at: null,
      },
    });

  if (!existingModerator) {
    throw new Error("Unauthorized: Moderator not found or inactive.");
  }

  // Check existence of the moderator action record to update
  const existingRecord =
    await MyGlobal.prisma.recipe_sharing_moderator_actions.findUnique({
      where: { id },
    });

  if (!existingRecord) {
    throw new Error(`Moderator action with id ${id} not found.`);
  }

  const now = toISOStringSafe(new Date());

  // Prepare update data object, only include defined fields
  const updateData = {
    moderator_id: body.moderator_id ?? undefined,
    action_type: body.action_type ?? undefined,
    target_id: body.target_id ?? undefined,
    action_timestamp: body.action_timestamp ?? undefined,
    comments: body.comments === null ? null : (body.comments ?? undefined),
    created_at: body.created_at ?? undefined,
    updated_at: body.updated_at ?? now,
    deleted_at:
      body.deleted_at === null ? null : (body.deleted_at ?? undefined),
  };

  // Update the record
  const updated = await MyGlobal.prisma.recipe_sharing_moderator_actions.update(
    {
      where: { id },
      data: updateData,
    },
  );

  // Convert returned Date objects to ISO strings conforming to API types
  return {
    id: updated.id as string & tags.Format<"uuid">,
    moderator_id: updated.moderator_id as string & tags.Format<"uuid">,
    action_type: updated.action_type,
    target_id: updated.target_id as string & tags.Format<"uuid">,
    action_timestamp: toISOStringSafe(updated.action_timestamp),
    comments: updated.comments ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
