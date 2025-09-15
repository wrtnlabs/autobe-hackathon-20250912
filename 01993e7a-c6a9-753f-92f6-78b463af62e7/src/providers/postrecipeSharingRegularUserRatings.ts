import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRating";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Creates a new rating for a recipe by an authenticated regular user.
 *
 * This operation only allows the authenticated user to create a rating for
 * themselves. The rating must be an integer between 1 and 5.
 *
 * @param props - Object containing the authenticated regular user and the
 *   rating data
 * @param props.regularUser - The authenticated regular user payload
 * @param props.body - The rating creation data
 * @returns The newly created rating with all fields populated and dates
 *   formatted as ISO strings
 * @throws {Error} If the authenticated user does not match the rating owner
 * @throws {Error} If the rating value is out of the valid range (1-5)
 */
export async function postrecipeSharingRegularUserRatings(props: {
  regularUser: RegularuserPayload;
  body: IRecipeSharingRating.ICreate;
}): Promise<IRecipeSharingRating> {
  const { regularUser, body } = props;

  if (regularUser.id !== body.recipe_sharing_user_id) {
    throw new Error("Unauthorized: Cannot create rating for another user");
  }

  if (body.rating < 1 || body.rating > 5) {
    throw new Error("Invalid rating: must be between 1 and 5");
  }

  const id = v4() as string & tags.Format<"uuid">;

  const created = await MyGlobal.prisma.recipe_sharing_ratings.create({
    data: {
      id: id,
      recipe_sharing_user_id: body.recipe_sharing_user_id,
      recipe_sharing_recipe_id: body.recipe_sharing_recipe_id,
      rating: body.rating,
    },
  });

  return {
    id: created.id,
    recipe_sharing_user_id: created.recipe_sharing_user_id,
    recipe_sharing_recipe_id: created.recipe_sharing_recipe_id,
    rating: created.rating,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
