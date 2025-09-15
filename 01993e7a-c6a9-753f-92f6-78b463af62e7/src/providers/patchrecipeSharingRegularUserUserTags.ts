import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingUserTags } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingUserTags";
import { IPageIRecipeSharingUserTags } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRecipeSharingUserTags";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Search and list user-suggested tags.
 *
 * Retrieves a paginated list of user-generated tag suggestions filtered by
 * optional criteria. Supports filtering by user ID, approved tag ID, partial
 * name match, and moderation status. Includes pagination and sorting
 * capabilities with defaults.
 *
 * @param props - Object containing the authenticated regular user and the
 *   search filter criteria
 * @param props.regularUser - Authenticated regular user performing the search
 * @param props.body - Search criteria filters
 * @returns Paginated summaries of user-suggested tags
 * @throws {Error} When an unexpected database error occurs
 */
export async function patchrecipeSharingRegularUserUserTags(props: {
  regularUser: RegularuserPayload;
  body: IRecipeSharingUserTags.IRequest;
}): Promise<IPageIRecipeSharingUserTags.ISummary> {
  const { regularUser, body } = props;

  // Extract pagination properties with safe defaults
  const page = typeof body.page === "number" && body.page > 0 ? body.page : 1;
  const limit =
    typeof body.limit === "number" && body.limit > 0 ? body.limit : 10;

  // Construct where clause with strict nullable and undefined checks
  const where: {
    user_id?: string & tags.Format<"uuid">;
    tag_id?: (string & tags.Format<"uuid">) | null;
    suggested_name?: { contains: string };
    status?: "pending" | "approved" | "rejected";
  } = {};

  if (body.user_id !== undefined && body.user_id !== null)
    where.user_id = body.user_id;

  if (body.tag_id !== undefined && body.tag_id !== null)
    where.tag_id = body.tag_id;

  if (body.suggested_name !== undefined && body.suggested_name !== null)
    where.suggested_name = { contains: body.suggested_name };

  if (body.status !== undefined && body.status !== null)
    where.status = body.status;

  // Parse sort directive with validation
  type SortField =
    | "id"
    | "suggested_name"
    | "status"
    | "created_at"
    | "updated_at";

  let orderBy:
    | Record<SortField, "asc" | "desc">
    | { [key: string]: "asc" | "desc" } = {
    created_at: "desc",
  };

  if (
    body.sort !== undefined &&
    body.sort !== null &&
    body.sort.trim().length > 0
  ) {
    const trimmed = body.sort.trim();
    const direction = trimmed.startsWith("-") ? "desc" : "asc";
    const field = trimmed.replace(/^[-+]/, "") as SortField;

    if (
      ["id", "suggested_name", "status", "created_at", "updated_at"].includes(
        field,
      )
    ) {
      orderBy = { [field]: direction };
    }
  }

  const skip = (page - 1) * limit;

  // Fetch data and total count in parallel
  const [results, total] = await Promise.all([
    MyGlobal.prisma.recipe_sharing_user_tags.findMany({
      where: where,
      orderBy: orderBy,
      skip: skip,
      take: limit,
    }),
    MyGlobal.prisma.recipe_sharing_user_tags.count({ where: where }),
  ]);

  // Map results to summary output
  const data = results.map(
    (record): IRecipeSharingUserTags.ISummary => ({
      id: record.id as string & tags.Format<"uuid">,
      suggested_name: record.suggested_name,
      status: record.status as "pending" | "approved" | "rejected",
    }),
  );

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data,
  };
}
