import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingPersonalizedFeed } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingPersonalizedFeed";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Retrieve detailed personalized feed entry by ID
 *
 * This operation fetches detailed information about a specific personalized
 * feed entry identified by its UUID. Access is restricted to the authenticated
 * regular user who owns the feed.
 *
 * @param props - Object containing required parameters
 * @param props.regularUser - The authenticated regular user payload containing
 *   user ID
 * @param props.personalizedFeedId - The UUID of the personalized feed entry to
 *   fetch
 * @returns The detailed personalized feed entry data as
 *   IRecipeSharingPersonalizedFeed
 * @throws {Error} Throws if the feed entry does not exist or is not owned by
 *   the user
 */
export async function getrecipeSharingRegularUserPersonalizedFeedsPersonalizedFeedId(props: {
  regularUser: RegularuserPayload;
  personalizedFeedId: string & tags.Format<"uuid">;
}): Promise<IRecipeSharingPersonalizedFeed> {
  const { regularUser, personalizedFeedId } = props;

  const feed =
    await MyGlobal.prisma.recipe_sharing_personalized_feeds.findFirstOrThrow({
      where: {
        id: personalizedFeedId,
        user_id: regularUser.id,
      },
    });

  return {
    id: feed.id,
    user_id: feed.user_id,
    recipe_id: feed.recipe_id,
    originator_user_id: feed.originator_user_id,
    created_at: toISOStringSafe(feed.created_at),
    updated_at: toISOStringSafe(feed.updated_at),
  };
}
