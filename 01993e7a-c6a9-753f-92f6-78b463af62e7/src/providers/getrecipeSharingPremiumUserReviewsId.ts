import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingReview";
import { PremiumuserPayload } from "../decorators/payload/PremiumuserPayload";

/**
 * Retrieve detailed recipe sharing review by ID
 *
 * Retrieves information about a specific review identified by its UUID. Premium
 * users may access reviews that are not soft deleted or those authored by
 * themselves. Throws an error if the review does not exist or access is
 * unauthorized.
 *
 * @param props - Object containing premiumUser payload and review id
 * @param props.premiumUser - Authenticated premium user payload
 * @param props.id - UUID of the review to retrieve
 * @returns Detailed review data conforming to IRecipeSharingReview
 * @throws {Error} When the review is not found
 * @throws {Error} When the review is soft deleted and not authored by the
 *   premium user
 */
export async function getrecipeSharingPremiumUserReviewsId(props: {
  premiumUser: PremiumuserPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IRecipeSharingReview> {
  const { premiumUser, id } = props;

  const review = await MyGlobal.prisma.recipe_sharing_reviews.findUniqueOrThrow(
    {
      where: { id },
    },
  );

  // Authorization check for premium users
  if (
    review.deleted_at !== null &&
    review.recipe_sharing_user_id !== premiumUser.id
  ) {
    throw new Error("Unauthorized access to this review");
  }

  return {
    id: review.id,
    recipe_sharing_user_id: review.recipe_sharing_user_id,
    recipe_sharing_recipe_id: review.recipe_sharing_recipe_id,
    review_text: review.review_text,
    created_at: toISOStringSafe(review.created_at),
    updated_at: toISOStringSafe(review.updated_at),
    deleted_at: review.deleted_at ? toISOStringSafe(review.deleted_at) : null,
  };
}
