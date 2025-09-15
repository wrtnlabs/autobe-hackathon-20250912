import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingModerationLogs } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingModerationLogs";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

/**
 * Retrieve detailed moderation log information by ID.
 *
 * This operation fetches a specific moderation log entry from the database,
 * including the action taken by a moderator, optional comments, and the
 * timestamp when the action was logged.
 *
 * Access to this operation is restricted to authenticated moderators.
 *
 * @param props - Object containing the moderator's authentication payload and
 *   the unique ID of the requested log entry.
 * @param props.moderator - The authenticated moderator performing the query.
 * @param props.id - The UUID of the moderation log to retrieve.
 * @returns The detailed moderation log entry matching the provided ID.
 * @throws {Error} Throws if no moderation log entry with the given ID exists.
 */
export async function getrecipeSharingModeratorModerationLogsId(props: {
  moderator: ModeratorPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IRecipeSharingModerationLogs> {
  const { moderator, id } = props;

  const record =
    await MyGlobal.prisma.recipe_sharing_moderation_logs.findUniqueOrThrow({
      where: { id },
    });

  return {
    id: record.id as string & tags.Format<"uuid">,
    recipe_sharing_review_id: record.recipe_sharing_review_id as string &
      tags.Format<"uuid">,
    recipe_sharing_moderator_id: record.recipe_sharing_moderator_id as string &
      tags.Format<"uuid">,
    action: record.action,
    comment: record.comment ?? null,
    created_at: toISOStringSafe(record.created_at),
  };
}
