import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingReviewFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingReviewFlag";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Update an existing flag on a specific review to modify the flag reason.
 *
 * This function verifies that the authenticated regular user is the owner of
 * the flag before allowing the update to ensure authorization and data
 * integrity.
 *
 * @param props - Object containing user payload, reviewId, flagId, and update
 *   body
 * @param props.regularUser - The authenticated regular user performing the
 *   update
 * @param props.reviewId - UUID of the review linked to the flag
 * @param props.flagId - UUID of the flag being updated
 * @param props.body - Partial update data with optional reason field
 * @returns The updated review flag object
 * @throws {Error} When the flag does not exist or does not belong to the review
 * @throws {Error} When the user is unauthorized to update the flag
 */
export async function putrecipeSharingRegularUserReviewsReviewIdFlagsFlagId(props: {
  regularUser: RegularuserPayload;
  reviewId: string & tags.Format<"uuid">;
  flagId: string & tags.Format<"uuid">;
  body: IRecipeSharingReviewFlag.IUpdate;
}): Promise<IRecipeSharingReviewFlag> {
  const { regularUser, reviewId, flagId, body } = props;

  // Fetch the existing flag
  const flag =
    await MyGlobal.prisma.recipe_sharing_review_flags.findUniqueOrThrow({
      where: { id: flagId },
    });

  // Confirm flag is linked to the specified review
  if (flag.recipe_sharing_review_id !== reviewId) {
    throw new Error("Flag does not correspond to the provided reviewId");
  }

  // Authorization: ensure the regular user owns the flag
  if (flag.recipe_sharing_user_id !== regularUser.id) {
    throw new Error("Unauthorized");
  }

  // Update the flag with the new reason if provided
  const updated = await MyGlobal.prisma.recipe_sharing_review_flags.update({
    where: { id: flagId },
    data: {
      reason: body.reason ?? undefined,
    },
  });

  return {
    id: updated.id,
    recipe_sharing_user_id: updated.recipe_sharing_user_id,
    recipe_sharing_review_id: updated.recipe_sharing_review_id,
    reason: updated.reason,
    created_at: toISOStringSafe(updated.created_at),
  };
}
