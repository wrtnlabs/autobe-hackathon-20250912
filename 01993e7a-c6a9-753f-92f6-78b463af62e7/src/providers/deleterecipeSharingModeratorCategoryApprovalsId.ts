import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

/**
 * Delete a category approval request by ID
 *
 * Permanently deletes a user-submitted category approval request from the
 * system. Only authorized moderators can perform this operation. The category
 * approval identified by the given UUID will be hard deleted, removing it
 * completely from the database and moderation queue.
 *
 * @param props - Object containing moderator authentication payload and
 *   category approval ID
 * @param props.moderator - Authenticated moderator payload with user ID
 * @param props.id - UUID string of the category approval to delete
 * @returns Promise<void> No content returned on success
 * @throws {Error} Throws if the category approval does not exist
 */
export async function deleterecipeSharingModeratorCategoryApprovalsId(props: {
  moderator: ModeratorPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { moderator, id } = props;

  // Verify the category approval exists
  await MyGlobal.prisma.recipe_sharing_category_approvals.findUniqueOrThrow({
    where: { id },
    rejectOnNotFound: true,
  });

  // Hard delete the category approval
  await MyGlobal.prisma.recipe_sharing_category_approvals.delete({
    where: { id },
  });
}
