import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingUserTags } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingUserTags";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Updates an existing user-suggested tag suggestion identified by userTagId.
 *
 * Only the original submitting regularUser is authorized to update the tag.
 * Validates that the suggested_name is unique among all user tags, and that the
 * status is one of the allowed enums: "pending", "approved", or "rejected".
 * Updates the updated_at timestamp upon modification.
 *
 * @param props - An object containing:
 *
 *   - RegularUser: The authenticated requesting user.
 *   - UserTagId: The UUID of the user tag suggestion to update.
 *   - Body: The partial update payload containing optional fields suggested_name
 *       and status.
 *
 * @returns The updated user tag suggestion.
 * @throws {Error} When the user is unauthorized to update the tag.
 * @throws {Error} When the status value is invalid.
 * @throws {Error} When the suggested_name is duplicated.
 */
export async function putrecipeSharingRegularUserUserTagsUserTagId(props: {
  regularUser: RegularuserPayload;
  userTagId: string & tags.Format<"uuid">;
  body: IRecipeSharingUserTags.IUpdate;
}): Promise<IRecipeSharingUserTags> {
  const now = toISOStringSafe(new Date());

  // Find existing tag
  const existingTag =
    await MyGlobal.prisma.recipe_sharing_user_tags.findUniqueOrThrow({
      where: { id: props.userTagId },
    });

  // Authorization check: only owner
  if (existingTag.user_id !== props.regularUser.id) {
    throw new Error("Unauthorized: You can only update your own tags");
  }

  // Validate status if provided
  if (props.body.status !== undefined) {
    const validStatuses = ["pending", "approved", "rejected"];
    if (!validStatuses.includes(props.body.status)) {
      throw new Error(`Invalid status: ${props.body.status}`);
    }
  }

  // Validate uniqueness of suggested_name if provided
  if (props.body.suggested_name !== undefined) {
    const duplicate = await MyGlobal.prisma.recipe_sharing_user_tags.findFirst({
      where: {
        suggested_name: props.body.suggested_name,
        NOT: { id: props.userTagId },
      },
    });
    if (duplicate) {
      throw new Error(
        `Suggested name ${props.body.suggested_name} already exists`,
      );
    }
  }

  // Prepare update data
  const updated = await MyGlobal.prisma.recipe_sharing_user_tags.update({
    where: { id: props.userTagId },
    data: {
      ...(props.body.suggested_name !== undefined && {
        suggested_name: props.body.suggested_name,
      }),
      ...(props.body.status !== undefined && { status: props.body.status }),
      updated_at: now,
    },
  });

  // Return updated tag with proper date conversions
  return {
    id: updated.id,
    user_id: updated.user_id,
    tag_id: updated.tag_id === null ? null : updated.tag_id,
    suggested_name: updated.suggested_name,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
