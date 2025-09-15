import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRating";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Retrieve a specific rating by ID
 *
 * This API operation retrieves a detailed rating record by its unique
 * identifier. It returns the user's rating for a recipe along with timestamps
 * for creation and updates.
 *
 * @param props - Object containing the authenticated regular user and rating ID
 * @param props.regularUser - The authenticated regular user making the request
 * @param props.id - UUID of the rating to retrieve
 * @returns The detailed rating record matching the given ID
 * @throws {Error} When no rating with the specified ID is found
 */
export async function getrecipeSharingRegularUserRatingsId(props: {
  regularUser: RegularuserPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IRecipeSharingRating> {
  const { regularUser, id } = props;

  const found = await MyGlobal.prisma.recipe_sharing_ratings.findUnique({
    where: { id },
  });

  if (!found) throw new Error(`Rating not found for id: ${id}`);

  return {
    id: found.id,
    recipe_sharing_user_id: found.recipe_sharing_user_id,
    recipe_sharing_recipe_id: found.recipe_sharing_recipe_id,
    rating: found.rating,
    created_at: toISOStringSafe(found.created_at),
    updated_at: toISOStringSafe(found.updated_at),
  };
}
