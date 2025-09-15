import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingFlagQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingFlagQueue";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

/**
 * Update an existing flag queue entry by its ID.
 *
 * This operation allows authorized moderators to modify the flag reason,
 * status, linked flagged review ID, and timestamps during moderation
 * workflows.
 *
 * @param props - Object containing moderator info, target ID, and update body
 * @param props.moderator - The authenticated moderator performing the update
 * @param props.id - UUID of the flag queue entry to be updated
 * @param props.body - Partial update data for the flag queue entry
 * @returns The updated flag queue entry with all fields
 * @throws {Error} If the flag queue entry with the specified ID does not exist
 */
export async function putrecipeSharingModeratorFlagQueuesId(props: {
  moderator: ModeratorPayload;
  id: string & tags.Format<"uuid">;
  body: IRecipeSharingFlagQueue.IUpdate;
}): Promise<IRecipeSharingFlagQueue> {
  const { moderator, id, body } = props;

  const existing =
    await MyGlobal.prisma.recipe_sharing_flag_queues.findUniqueOrThrow({
      where: { id },
    });

  const updated = await MyGlobal.prisma.recipe_sharing_flag_queues.update({
    where: { id },
    data: {
      ...(body.recipe_sharing_review_id !== undefined
        ? { recipe_sharing_review_id: body.recipe_sharing_review_id }
        : {}),
      ...(body.reported_by_user_id !== undefined
        ? { reported_by_user_id: body.reported_by_user_id }
        : {}),
      ...(body.flag_reason !== undefined
        ? { flag_reason: body.flag_reason }
        : {}),
      ...(body.status !== undefined ? { status: body.status } : {}),
      ...(body.created_at !== undefined ? { created_at: body.created_at } : {}),
      ...(body.updated_at !== undefined ? { updated_at: body.updated_at } : {}),
      ...(body.deleted_at !== undefined ? { deleted_at: body.deleted_at } : {}),
    },
  });

  return {
    id: updated.id,
    recipe_sharing_review_id: updated.recipe_sharing_review_id ?? null,
    reported_by_user_id: updated.reported_by_user_id,
    flag_reason: updated.flag_reason,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
