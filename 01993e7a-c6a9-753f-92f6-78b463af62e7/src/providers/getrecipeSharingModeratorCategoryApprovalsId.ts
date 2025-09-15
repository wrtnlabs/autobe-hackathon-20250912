import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingCategoryApprovals } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingCategoryApprovals";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

/**
 * Retrieve detailed information for a category approval.
 *
 * Fetches detailed data about a category approval request identified by the
 * provided ID. The response includes the category name, approval status,
 * submission timestamp, review timestamp if applicable, and audit metadata.
 * This detailed view enables moderators to assess the submission context and
 * make informed decisions.
 *
 * Access to this operation is restricted to users with moderator roles due to
 * the sensitive nature of moderation data.
 *
 * @param props - Object containing the moderator's identity and the ID of the
 *   category approval record
 * @param props.moderator - The authenticated moderator performing the operation
 * @param props.id - Unique identifier of the category approval record
 * @returns Detailed category approval information matching
 *   IRecipeSharingCategoryApprovals
 * @throws {Error} Throws if the category approval record with the specified ID
 *   does not exist
 */
export async function getrecipeSharingModeratorCategoryApprovalsId(props: {
  moderator: ModeratorPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IRecipeSharingCategoryApprovals> {
  const { id } = props;

  const record =
    await MyGlobal.prisma.recipe_sharing_category_approvals.findUniqueOrThrow({
      where: { id },
    });

  return {
    id: record.id,
    submitted_by_user_id: record.submitted_by_user_id,
    category_name: record.category_name,
    approval_status: record.approval_status,
    submitted_at: toISOStringSafe(record.submitted_at),
    reviewed_at: record.reviewed_at
      ? toISOStringSafe(record.reviewed_at)
      : null,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}
