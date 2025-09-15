import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingPersonalizedFeed } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingPersonalizedFeed";
import { PremiumuserPayload } from "../decorators/payload/PremiumuserPayload";

/**
 * Retrieve detailed personalized feed entry by ID.
 *
 * Fetches a recipe_sharing_personalized_feeds row by its UUID primary key.
 * Authorization requires the premiumUser to own the personalized feed entry.
 * Throws error if no record found or unauthorized access occurs.
 *
 * @param props - Object containing premiumUser authentication and
 *   personalizedFeedId parameter.
 * @param props.premiumUser - The authenticated premium user making the request.
 * @param props.personalizedFeedId - UUID of the personalized feed entry to
 *   fetch.
 * @returns The personalized feed entry data matching the
 *   IRecipeSharingPersonalizedFeed structure.
 * @throws {Error} If the personalized feed entry does not exist.
 * @throws {Error} If the premiumUser is not authorized to access this entry.
 */
export async function getrecipeSharingPremiumUserPersonalizedFeedsPersonalizedFeedId(props: {
  premiumUser: PremiumuserPayload;
  personalizedFeedId: string & tags.Format<"uuid">;
}): Promise<IRecipeSharingPersonalizedFeed> {
  const { premiumUser, personalizedFeedId } = props;

  const personalizedFeed =
    await MyGlobal.prisma.recipe_sharing_personalized_feeds.findUniqueOrThrow({
      where: { id: personalizedFeedId },
    });

  if (personalizedFeed.user_id !== premiumUser.id) {
    throw new Error("Unauthorized access to personalized feed entry");
  }

  return {
    id: personalizedFeed.id,
    user_id: personalizedFeed.user_id,
    recipe_id: personalizedFeed.recipe_id,
    originator_user_id: personalizedFeed.originator_user_id,
    created_at: toISOStringSafe(personalizedFeed.created_at),
    updated_at: toISOStringSafe(personalizedFeed.updated_at),
  };
}
