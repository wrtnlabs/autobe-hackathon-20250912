import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingCategoryApprovals } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingCategoryApprovals";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

/**
 * Update an existing category approval request.
 *
 * This operation allows moderators to modify a category approval entry
 * identified by its ID. They can change the approval_status, category_name, and
 * reviewed_at timestamp.
 *
 * @param props - Object containing moderator, id, and body fields
 * @param props.moderator - Authenticated moderator performing the update
 * @param props.id - UUID of the category approval record to update
 * @param props.body - Update payload with optional fields to modify
 * @returns The updated category approval object
 * @throws {Error} Throws if the category approval record is not found
 */
export async function putrecipeSharingModeratorCategoryApprovalsId(props: {
  moderator: ModeratorPayload;
  id: string & tags.Format<"uuid">;
  body: IRecipeSharingCategoryApprovals.IUpdate;
}): Promise<IRecipeSharingCategoryApprovals> {
  const { moderator, id, body } = props;

  // Verify the category approval exists
  await MyGlobal.prisma.recipe_sharing_category_approvals.findUniqueOrThrow({
    where: { id },
  });

  // Prepare data for update
  const data: {
    category_name?: string;
    approval_status?: "pending" | "approved" | "rejected";
    reviewed_at?: string | null;
  } = {};

  if (body.category_name !== undefined) data.category_name = body.category_name;
  if (body.approval_status !== undefined)
    data.approval_status = body.approval_status;
  if (body.reviewed_at === null) data.reviewed_at = null;
  else if (body.reviewed_at !== undefined) data.reviewed_at = body.reviewed_at;

  // Update the record
  const updated =
    await MyGlobal.prisma.recipe_sharing_category_approvals.update({
      where: { id },
      data,
    });

  // Return the updated record, converting Date fields to ISO strings
  return {
    id: updated.id as string & tags.Format<"uuid">,
    submitted_by_user_id: updated.submitted_by_user_id as string &
      tags.Format<"uuid">,
    category_name: updated.category_name,
    approval_status: updated.approval_status as
      | "pending"
      | "approved"
      | "rejected",
    submitted_at: toISOStringSafe(updated.submitted_at),
    reviewed_at: updated.reviewed_at
      ? toISOStringSafe(updated.reviewed_at)
      : null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
