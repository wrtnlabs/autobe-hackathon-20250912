import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Permanently deletes a user rating by its unique ID.
 *
 * This operation allows an authenticated regular user to delete their own
 * rating record from the recipe_sharing_ratings database table. The deletion is
 * physical (hard delete) as the schema does not support soft deletion for
 * ratings.
 *
 * @param props - The function properties
 * @param props.regularUser - Authenticated regular user performing the
 *   operation
 * @param props.id - UUID string identifying the rating to delete
 * @throws {Error} If the rating does not exist
 * @throws {Error} If the rating does not belong to the authenticated user
 */
export async function deleterecipeSharingRegularUserRatingsId(props: {
  regularUser: RegularuserPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { regularUser, id } = props;

  // Fetch the rating record by ID or throw if not found
  const rating = await MyGlobal.prisma.recipe_sharing_ratings.findUniqueOrThrow(
    {
      where: { id },
    },
  );

  // Verify the rating belongs to the authenticated user
  if (rating.recipe_sharing_user_id !== regularUser.id) {
    throw new Error("Unauthorized: You can only delete your own ratings");
  }

  // Delete the rating record permanently
  await MyGlobal.prisma.recipe_sharing_ratings.delete({
    where: { id },
  });
}
