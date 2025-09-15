import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingReviewFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingReviewFlag";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

/**
 * Get information of a review flag
 *
 * Retrieves detailed information about a specific flag on a recipe review. This
 * function is accessible only to moderator users.
 *
 * @param props - Object containing moderator info and identifiers
 * @param props.moderator - Authenticated moderator payload
 * @param props.reviewId - UUID of the review being flagged
 * @param props.flagId - UUID of the specific flag
 * @returns Detailed review flag information matching IRecipeSharingReviewFlag
 * @throws {Error} If the flag with given identifiers does not exist
 */
export async function getrecipeSharingModeratorReviewsReviewIdFlagsFlagId(props: {
  moderator: ModeratorPayload;
  reviewId: string & tags.Format<"uuid">;
  flagId: string & tags.Format<"uuid">;
}): Promise<IRecipeSharingReviewFlag> {
  const { moderator, reviewId, flagId } = props;

  const flag =
    await MyGlobal.prisma.recipe_sharing_review_flags.findFirstOrThrow({
      where: {
        id: flagId,
        recipe_sharing_review_id: reviewId,
      },
      select: {
        id: true,
        recipe_sharing_user_id: true,
        recipe_sharing_review_id: true,
        reason: true,
        created_at: true,
      },
    });

  return {
    id: flag.id,
    recipe_sharing_user_id: flag.recipe_sharing_user_id,
    recipe_sharing_review_id: flag.recipe_sharing_review_id,
    reason: flag.reason,
    created_at: toISOStringSafe(flag.created_at),
  };
}
