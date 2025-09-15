import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingReview";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Retrieve detailed recipe sharing review by ID
 *
 * This operation retrieves detailed information about a specific recipe sharing
 * review by its unique identifier. It ensures secure access for regular users,
 * allowing them to view only their own non-deleted reviews.
 *
 * @param props - Object containing the authenticated regular user and the
 *   review ID
 * @param props.regularUser - Authenticated regular user payload
 * @param props.id - Unique identifier of the target review
 * @returns The detailed recipe sharing review
 * @throws {Error} Throws if the review is not found or access is unauthorized
 */
export async function getrecipeSharingRegularUserReviewsId(props: {
  regularUser: RegularuserPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IRecipeSharingReview> {
  try {
    const review =
      await MyGlobal.prisma.recipe_sharing_reviews.findUniqueOrThrow({
        where: {
          id: props.id,
          recipe_sharing_user_id: props.regularUser.id,
          deleted_at: null,
        },
      });

    return {
      id: review.id,
      recipe_sharing_user_id: review.recipe_sharing_user_id,
      recipe_sharing_recipe_id: review.recipe_sharing_recipe_id,
      review_text: review.review_text,
      created_at: toISOStringSafe(review.created_at),
      updated_at: toISOStringSafe(review.updated_at),
      deleted_at: review.deleted_at ?? null,
    };
  } catch (error) {
    throw new Error(
      `Review not found or unauthorized access: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
