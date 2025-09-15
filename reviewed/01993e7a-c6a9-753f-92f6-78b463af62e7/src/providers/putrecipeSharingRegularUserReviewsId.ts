import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingReview";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Update an existing recipe sharing review by ID.
 *
 * This operation updates the review text and deletion status for a recipe
 * review identified by its unique ID. It ensures that only the review owner
 * (the authenticated regular user) can perform the update.
 *
 * If no review is found with the given ID, an error is thrown. If the review is
 * already deleted (soft deleted), updates are disallowed.
 *
 * The updated review data with correctly formatted date strings is returned.
 *
 * @param props - Object containing the authenticated regular user, review ID,
 *   and the update payload for the review.
 * @returns The updated recipe sharing review data.
 * @throws {Error} If the review does not exist.
 * @throws {Error} If the review is soft deleted.
 * @throws {Error} If the user is not authorized to update the review.
 */
export async function putrecipeSharingRegularUserReviewsId(props: {
  regularUser: RegularuserPayload;
  id: string & tags.Format<"uuid">;
  body: IRecipeSharingReview.IUpdate;
}): Promise<IRecipeSharingReview> {
  const { regularUser, id, body } = props;

  const review = await MyGlobal.prisma.recipe_sharing_reviews.findUnique({
    where: { id },
  });

  if (!review) {
    throw new Error(`Review with ID ${id} not found.`);
  }

  if (review.deleted_at !== null) {
    throw new Error("Cannot update a deleted review.");
  }

  if (review.recipe_sharing_user_id !== regularUser.id) {
    throw new Error(
      "Unauthorized: Only the review owner can update the review.",
    );
  }

  const now = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.recipe_sharing_reviews.update({
    where: { id },
    data: {
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
    deleted_at: updated.deleted_at ?? null,
  };
}
