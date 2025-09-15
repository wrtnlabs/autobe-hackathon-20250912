import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingCategoryApprovals } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingCategoryApprovals";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Submit a new category approval request
 *
 * Allows an authenticated regular user to propose a new category or tag for
 * moderation approval. The submission is saved with status 'pending' and
 * includes timestamps.
 *
 * @param props - Object containing:
 *
 *   - RegularUser: The authenticated regular user
 *   - Body: New category approval details
 *
 * @returns The created category approval record with all fields
 * @throws {Error} When creation fails due to DB or other issues
 */
export async function postrecipeSharingRegularUserCategoryApprovals(props: {
  regularUser: RegularuserPayload;
  body: IRecipeSharingCategoryApprovals.ICreate;
}): Promise<IRecipeSharingCategoryApprovals> {
  const { regularUser, body } = props;

  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  const created =
    await MyGlobal.prisma.recipe_sharing_category_approvals.create({
      data: {
        submitted_by_user_id: regularUser.id,
        category_name: body.suggested_name ?? "",
        approval_status: "pending",
        submitted_at: now,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

  return {
    id: created.id,
    submitted_by_user_id: created.submitted_by_user_id,
    category_name: created.category_name,
    approval_status: created.approval_status,
    submitted_at: toISOStringSafe(created.submitted_at),
    reviewed_at: created.reviewed_at
      ? toISOStringSafe(created.reviewed_at)
      : null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
