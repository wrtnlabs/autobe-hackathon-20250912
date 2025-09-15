import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingFlagQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingFlagQueue";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Creates a new flag queue entry for a flagged review, which is part of the
 * moderation process in the recipe sharing platform.
 *
 * This operation records the review flagged by a user, the reason for flagging,
 * and timestamps for tracking. Moderators use this to triage and respond to
 * flagged inappropriate content efficiently.
 *
 * @param props - Object containing the authenticated regular user and flag
 *   queue creation data
 * @param props.regularUser - The authenticated regular user making this request
 * @param props.body - The data for creating a new flag queue entry
 * @returns The newly created flag queue entry
 * @throws {Error} Throws if the database operation fails
 */
export async function postrecipeSharingRegularUserFlagQueues(props: {
  regularUser: RegularuserPayload;
  body: IRecipeSharingFlagQueue.ICreate;
}): Promise<IRecipeSharingFlagQueue> {
  const id = v4() as string & tags.Format<"uuid">;

  const created = await MyGlobal.prisma.recipe_sharing_flag_queues.create({
    data: {
      id,
      recipe_sharing_review_id: props.body.recipe_sharing_review_id ?? null,
      reported_by_user_id: props.body.reported_by_user_id,
      flag_reason: props.body.flag_reason,
      status: props.body.status,
      created_at: props.body.created_at,
      updated_at: props.body.updated_at,
      deleted_at: props.body.deleted_at ?? null,
    },
  });

  return {
    id: created.id as string & tags.Format<"uuid">,
    recipe_sharing_review_id: created.recipe_sharing_review_id ?? null,
    reported_by_user_id: created.reported_by_user_id as string &
      tags.Format<"uuid">,
    flag_reason: created.flag_reason,
    status: created.status,
    created_at: created.created_at as string & tags.Format<"date-time">,
    updated_at: created.updated_at as string & tags.Format<"date-time">,
    deleted_at: created.deleted_at ?? null,
  };
}
