import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingModeratorActions } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingModeratorActions";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

/**
 * Create a new moderator action record documenting the moderation activity
 * performed.
 *
 * This endpoint requires an authenticated moderator to provide the moderation
 * details. It stores the action type (e.g., hide_review, approve_category), the
 * target entity ID, a timestamp of when the action occurred, and optional
 * comments.
 *
 * The system manages creation and update timestamps automatically.
 *
 * @param props - Object containing authentication and request body
 * @param props.moderator - The authenticated moderator performing the action
 * @param props.body - Details of the moderator action to create
 * @returns The created moderator action record with all details
 * @throws {Error} When required fields are missing or invalid
 */
export async function postrecipeSharingModeratorModeratorActions(props: {
  moderator: ModeratorPayload;
  body: IRecipeSharingModeratorActions.ICreate;
}): Promise<IRecipeSharingModeratorActions> {
  const { moderator, body } = props;

  const id = v4() as string & tags.Format<"uuid">;
  const actionTimestamp = toISOStringSafe(body.action_timestamp);

  const created = await MyGlobal.prisma.recipe_sharing_moderator_actions.create(
    {
      data: {
        id,
        moderator_id: moderator.id,
        action_type: body.action_type,
        target_id: body.target_id,
        action_timestamp: actionTimestamp,
        comments: body.comments ?? undefined,
      },
    },
  );

  return {
    id: created.id,
    moderator_id: created.moderator_id,
    action_type: created.action_type,
    target_id: created.target_id,
    action_timestamp: toISOStringSafe(created.action_timestamp),
    comments: created.comments ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
