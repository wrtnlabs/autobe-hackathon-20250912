import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingReview";
import { PremiumuserPayload } from "../decorators/payload/PremiumuserPayload";

/**
 * Create a new recipe sharing review.
 *
 * This function allows an authenticated premium user to create a detailed
 * review associated with a specific recipe. It ensures proper assignment of
 * required fields, timestamps, and UUID generation for the review record.
 *
 * @param props - Object containing the authenticated premium user and the
 *   review creation body.
 * @param props.premiumUser - The authenticated premium user making the request.
 * @param props.body - The review creation info containing user ID, recipe ID,
 *   and review text.
 * @returns The newly created recipe sharing review info with timestamps.
 * @throws {Error} Any Prisma client errors from database operations.
 */
export async function postrecipeSharingPremiumUserReviews(props: {
  premiumUser: PremiumuserPayload;
  body: IRecipeSharingReview.ICreate;
}): Promise<IRecipeSharingReview> {
  const { body } = props;

  const id = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.recipe_sharing_reviews.create({
    data: {
      id,
      recipe_sharing_user_id: body.recipe_sharing_user_id,
      recipe_sharing_recipe_id: body.recipe_sharing_recipe_id,
      review_text: body.review_text,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id,
    recipe_sharing_user_id: created.recipe_sharing_user_id,
    recipe_sharing_recipe_id: created.recipe_sharing_recipe_id,
    review_text: created.review_text,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ?? null,
  };
}
