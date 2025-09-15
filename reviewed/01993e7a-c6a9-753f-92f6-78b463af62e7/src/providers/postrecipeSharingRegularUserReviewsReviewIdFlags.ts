import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingReviewFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingReviewFlag";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Creates a new flag on a specific review, allowing a user to report
 * inappropriate or problematic content. This operation stores the user flag
 * info in 'recipe_sharing_review_flags' table.
 *
 * Authorization: Only authenticated 'regularUser' may call this.
 *
 * @param props - Object containing the authenticated user, review ID, and flag
 *   creation data
 * @param props.regularUser - The authenticated regular user creating the flag
 * @param props.reviewId - The UUID of the review being flagged
 * @param props.body - The flag data including user ID, review ID, and reason
 * @returns The created review flag record with accurate timestamps
 * @throws {Error} When the user ID in body does not match authenticated user
 * @throws {Error} When the review ID in body does not match the path parameter
 */
export async function postrecipeSharingRegularUserReviewsReviewIdFlags(props: {
  regularUser: RegularuserPayload;
  reviewId: string & tags.Format<"uuid">;
  body: IRecipeSharingReviewFlag.ICreate;
}): Promise<IRecipeSharingReviewFlag> {
  const { regularUser, reviewId, body } = props;

  if (body.recipe_sharing_user_id !== regularUser.id) {
    throw new Error(
      "User ID mismatch between authenticated user and flag data",
    );
  }

  if (body.recipe_sharing_review_id !== reviewId) {
    throw new Error("Review ID mismatch between path parameter and flag data");
  }

  const now = toISOStringSafe(new Date());
  const id = v4() as string & tags.Format<"uuid">;

  const created = await MyGlobal.prisma.recipe_sharing_review_flags.create({
    data: {
      id: id,
      recipe_sharing_user_id: body.recipe_sharing_user_id,
      recipe_sharing_review_id: body.recipe_sharing_review_id,
      reason: body.reason,
      created_at: now,
    },
  });

  return {
    id: created.id,
    recipe_sharing_user_id: created.recipe_sharing_user_id,
    recipe_sharing_review_id: created.recipe_sharing_review_id,
    reason: created.reason,
    created_at: toISOStringSafe(created.created_at),
  };
}
