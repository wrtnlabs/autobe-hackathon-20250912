import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingModeratorActions } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingModeratorActions";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

/**
 * Retrieves detailed information about a specific moderator action by its
 * unique identifier.
 *
 * This operation fetches audit-trail data including moderator ID, action type,
 * target entity, timestamps, and optional comments related to moderation
 * activities such as review hiding, category approvals, etc.
 *
 * Access control ensures only authorized moderators can invoke this endpoint.
 *
 * @param props - Object containing moderator payload and moderator action ID
 * @param props.moderator - Authenticated moderator performing the request
 * @param props.id - Unique UUID of the moderator action to retrieve
 * @returns Detailed information of the requested moderator action
 * @throws {Error} If no moderator action matches the given ID
 */
export async function getrecipeSharingModeratorModeratorActionsId(props: {
  moderator: ModeratorPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IRecipeSharingModeratorActions> {
  const { moderator, id } = props;

  const record =
    await MyGlobal.prisma.recipe_sharing_moderator_actions.findUniqueOrThrow({
      where: { id },
      select: {
        id: true,
        moderator_id: true,
        action_type: true,
        target_id: true,
        action_timestamp: true,
        comments: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });

  return {
    id: record.id,
    moderator_id: record.moderator_id,
    action_type: record.action_type,
    target_id: record.target_id,
    action_timestamp: toISOStringSafe(record.action_timestamp),
    comments: record.comments ?? null,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}
