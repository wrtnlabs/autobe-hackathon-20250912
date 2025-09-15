import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingCategoryApprovals } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingCategoryApprovals";
import { IPageIRecipeSharingCategoryApprovals } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRecipeSharingCategoryApprovals";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchrecipeSharingModeratorCategoryApprovals(props: {
  moderator: ModeratorPayload;
  body: IRecipeSharingCategoryApprovals.IRequest;
}): Promise<IPageIRecipeSharingCategoryApprovals.ISummary> {
  const { body } = props;

  // The IRequest interface does not have page or limit properties,
  // so we use default pagination values
  const page = 1 as number & tags.Type<"int32"> & tags.Minimum<0> as number;
  const limit = 10 as number & tags.Type<"int32"> & tags.Minimum<0> as number;
  const skip = (page - 1) * limit;

  // Compose where clause for filtering with null and undefined checks
  const where: {
    id?: string & tags.Format<"uuid">;
    submitted_by_user_id?: string & tags.Format<"uuid">;
    category_name?: { contains: string };
    approval_status?: "pending" | "approved" | "rejected";
    submitted_at?: string & tags.Format<"date-time">;
    reviewed_at?: string & tags.Format<"date-time">;
    created_at?: string & tags.Format<"date-time">;
    updated_at?: string & tags.Format<"date-time">;
    deleted_at: null;
  } = {
    deleted_at: null,

    ...(body.id !== undefined && body.id !== null && { id: body.id }),
    ...(body.submitted_by_user_id !== undefined &&
      body.submitted_by_user_id !== null && {
        submitted_by_user_id: body.submitted_by_user_id,
      }),
    ...(body.category_name !== undefined &&
      body.category_name !== null && {
        category_name: { contains: body.category_name },
      }),
    ...(body.approval_status !== undefined &&
      body.approval_status !== null && {
        approval_status: body.approval_status,
      }),
    ...(body.submitted_at !== undefined &&
      body.submitted_at !== null && { submitted_at: body.submitted_at }),
    ...(body.reviewed_at !== undefined &&
      body.reviewed_at !== null && { reviewed_at: body.reviewed_at }),
    ...(body.created_at !== undefined &&
      body.created_at !== null && { created_at: body.created_at }),
    ...(body.updated_at !== undefined &&
      body.updated_at !== null && { updated_at: body.updated_at }),
  };

  // Fetch results with pagination
  const [results, total] = await Promise.all([
    MyGlobal.prisma.recipe_sharing_category_approvals.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.recipe_sharing_category_approvals.count({ where }),
  ]);

  // Return paginated result summary
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((item) => ({
      id: item.id,
      submitted_by_user_id: item.submitted_by_user_id,
      category_name: item.category_name,
      approval_status: item.approval_status as
        | "pending"
        | "approved"
        | "rejected",
      submitted_at: toISOStringSafe(item.submitted_at),
      reviewed_at: item.reviewed_at ? toISOStringSafe(item.reviewed_at) : null,
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
    })),
  };
}
