import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingReview";
import { PremiumuserPayload } from "../decorators/payload/PremiumuserPayload";

/**
 * Update an existing recipe sharing review identified by its unique ID.
 *
 * Allows modification of review content with audit timestamps. Only the review
 * author or authorized moderators can perform updates. Prevents updates to
 * deleted reviews.
 *
 * @param props - Object containing premiumUser, id, and update body
 * @param props.premiumUser - Authenticated premium user performing the update
 * @param props.id - UUID of the review to update
 * @param props.body - Partial review data to update
 * @returns Updated recipe sharing review
 * @throws {Error} When review not found or deleted
 * @throws {Error} When user is not the review author
 */
export async function putrecipeSharingPremiumUserReviewsId(props: {
  premiumUser: PremiumuserPayload;
  id: string & tags.Format<"uuid">;
  body: IRecipeSharingReview.IUpdate;
}): Promise<IRecipeSharingReview> {
  const { premiumUser, id, body } = props;

  const review = await MyGlobal.prisma.recipe_sharing_reviews.findFirst({
    where: { id, deleted_at: null },
  });
  if (!review) throw new Error("Review not found or deleted");

  if (review.recipe_sharing_user_id !== premiumUser.id) {
    throw new Error("Unauthorized: You can only update your own review");
  }

  const now = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.recipe_sharing_reviews.update({
    where: { id },
    data: {
      recipe_sharing_user_id: body.recipe_sharing_user_id ?? undefined,
      recipe_sharing_recipe_id: body.recipe_sharing_recipe_id ?? undefined,
      review_text: body.review_text ?? undefined,
      deleted_at: body.deleted_at ?? undefined,
      updated_at: now,
    },
  });

  return {
    id: updated.id,
    recipe_sharing_user_id: updated.recipe_sharing_user_id,
    recipe_sharing_recipe_id: updated.recipe_sharing_recipe_id,
    review_text: updated.review_text,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
