import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingFlagQueues } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingFlagQueues";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

/**
 * Get flagged review queue entry details by ID
 *
 * This operation retrieves detailed information about a specific flagged review
 * queue entry by its unique ID. Moderators use this to assess individual flags
 * and determine appropriate moderation actions.
 *
 * @param props - Object containing the moderator payload and the ID of the
 *   flagged review queue entry
 * @param props.moderator - The authenticated moderator making the request
 * @param props.id - The UUID of the flagged review queue entry to retrieve
 * @returns The detailed flagged review queue entry data conforming to
 *   IRecipeSharingFlagQueues
 * @throws {Error} Throws if the flagged review queue entry does not exist or is
 *   soft deleted
 */
export async function getrecipeSharingModeratorFlagQueuesId(props: {
  moderator: ModeratorPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IRecipeSharingFlagQueues> {
  const { moderator, id } = props;

  // Retrieve flagged review queue entry with matching ID and not soft deleted
  const flaggedQueue =
    await MyGlobal.prisma.recipe_sharing_flag_queues.findFirst({
      where: {
        id,
        deleted_at: null,
      },
    });

  if (!flaggedQueue) {
    throw new Error(`Flagged review queue entry not found with id: ${id}`);
  }

  // Return object with proper date conversions and null handling
  return {
    id: flaggedQueue.id,
    recipe_sharing_review_id: flaggedQueue.recipe_sharing_review_id ?? null,
    reported_by_user_id: flaggedQueue.reported_by_user_id,
    flag_reason: flaggedQueue.flag_reason,
    status: flaggedQueue.status,
    created_at: toISOStringSafe(flaggedQueue.created_at),
    updated_at: toISOStringSafe(flaggedQueue.updated_at),
    deleted_at: flaggedQueue.deleted_at ?? null,
  };
}
