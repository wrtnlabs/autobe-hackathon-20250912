import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingPersonalizedFeed } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingPersonalizedFeed";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Update a personalized feed entry by ID.
 *
 * This operation updates the personalized feed entry identified by the given
 * personalizedFeedId. It allows updating the user it belongs to, the recipe it
 * displays, and the originator user.
 *
 * Authorization: Requires authenticated regularUser.
 *
 * @param props - Object containing regularUser payload, personalizedFeedId, and
 *   the update body.
 * @param props.regularUser - The authenticated regular user performing the
 *   update.
 * @param props.personalizedFeedId - UUID of the personalized feed entry to
 *   update.
 * @param props.body - Update data for the personalized feed entry.
 * @returns The updated personalized feed entry.
 * @throws {Error} If the personalized feed entry with the given ID does not
 *   exist.
 */
export async function putrecipeSharingRegularUserPersonalizedFeedsPersonalizedFeedId(props: {
  regularUser: RegularuserPayload;
  personalizedFeedId: string & tags.Format<"uuid">;
  body: IRecipeSharingPersonalizedFeed.IUpdate;
}): Promise<IRecipeSharingPersonalizedFeed> {
  const { regularUser, personalizedFeedId, body } = props;

  // Verify the personalized feed entry exists, throws if not found
  await MyGlobal.prisma.recipe_sharing_personalized_feeds.findUniqueOrThrow({
    where: { id: personalizedFeedId },
  });

  // Perform update with provided fields and updated_at timestamp
  const updated =
    await MyGlobal.prisma.recipe_sharing_personalized_feeds.update({
      where: { id: personalizedFeedId },
      data: {
        ...(body.user_id !== undefined ? { user_id: body.user_id } : {}),
        ...(body.recipe_id !== undefined ? { recipe_id: body.recipe_id } : {}),
        ...(body.originator_user_id !== undefined
          ? { originator_user_id: body.originator_user_id }
          : {}),
        updated_at: toISOStringSafe(new Date()),
      },
    });

  // Return result with date fields converted correctly
  return {
    id: updated.id as string & tags.Format<"uuid">,
    user_id: updated.user_id as string & tags.Format<"uuid">,
    recipe_id: updated.recipe_id as string & tags.Format<"uuid">,
    originator_user_id: updated.originator_user_id as string &
      tags.Format<"uuid">,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
