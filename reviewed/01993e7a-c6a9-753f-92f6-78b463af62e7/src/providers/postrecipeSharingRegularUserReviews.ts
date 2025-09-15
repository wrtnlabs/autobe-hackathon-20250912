import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingReview";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

export async function postrecipeSharingRegularUserReviews(props: {
  regularUser: RegularuserPayload;
  body: IRecipeSharingReview.ICreate;
}): Promise<IRecipeSharingReview> {
  const { regularUser, body } = props;

  if (regularUser.id !== body.recipe_sharing_user_id) {
    throw new Error("Unauthorized to create review for other users");
  }

  const existingReview = await MyGlobal.prisma.recipe_sharing_reviews.findFirst(
    {
      where: {
        recipe_sharing_user_id: body.recipe_sharing_user_id,
        recipe_sharing_recipe_id: body.recipe_sharing_recipe_id,
        deleted_at: null,
      },
      select: { id: true },
    },
  );

  if (existingReview) {
    throw new Error("Review already exists for this user and recipe");
  }

  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.recipe_sharing_reviews.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      recipe_sharing_user_id: body.recipe_sharing_user_id,
      recipe_sharing_recipe_id: body.recipe_sharing_recipe_id,
      review_text: body.review_text,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    recipe_sharing_user_id: created.recipe_sharing_user_id,
    recipe_sharing_recipe_id: created.recipe_sharing_recipe_id,
    review_text: created.review_text,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
  };
}
