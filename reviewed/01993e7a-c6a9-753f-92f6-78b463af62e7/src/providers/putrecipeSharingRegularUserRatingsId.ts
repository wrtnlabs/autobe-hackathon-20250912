import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRating";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Update an existing user rating identified by its unique ID.
 *
 * Allows an authenticated regular user to modify their own rating value for a
 * recipe. Ensures authorization by verifying the owner of the rating.
 *
 * @param props - Object containing:
 *
 *   - RegularUser: The authenticated regular user making the request
 *   - Id: Unique identifier of the rating to update
 *   - Body: The updated rating data containing the new star rating
 *
 * @returns The fully updated rating entity
 * @throws {Error} When the rating does not exist
 * @throws {Error} When the authenticated user is not the owner of the rating
 */
export async function putrecipeSharingRegularUserRatingsId(props: {
  regularUser: RegularuserPayload;
  id: string & tags.Format<"uuid">;
  body: IRecipeSharingRating.IUpdate;
}): Promise<IRecipeSharingRating> {
  const { regularUser, id, body } = props;

  // Fetch existing rating
  const existingRating =
    await MyGlobal.prisma.recipe_sharing_ratings.findUnique({
      where: { id },
    });

  if (!existingRating) {
    throw new Error("Rating not found");
  }

  // Verify ownership
  if (existingRating.recipe_sharing_user_id !== regularUser.id) {
    throw new Error("Unauthorized: You can only update your own ratings");
  }

  // Generate current timestamp
  const now = toISOStringSafe(new Date());

  // Execute update query
  const updated = await MyGlobal.prisma.recipe_sharing_ratings.update({
    where: { id },
    data: {
      rating: body.rating,
      updated_at: now,
    },
  });

  // Return updated rating with dates converted
  return {
    id: updated.id as string & tags.Format<"uuid">,
    recipe_sharing_user_id: updated.recipe_sharing_user_id as string &
      tags.Format<"uuid">,
    recipe_sharing_recipe_id: updated.recipe_sharing_recipe_id as string &
      tags.Format<"uuid">,
    rating: updated.rating,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
