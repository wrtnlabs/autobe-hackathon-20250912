import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingRecurringMealPlans } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRecurringMealPlans";
import { IPageIRecipeSharingRecurringMealPlans } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRecipeSharingRecurringMealPlans";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Search and retrieve a paginated list of recurring meal plans owned by a
 * regular user.
 *
 * This endpoint returns the authenticated user's recurring meal plans,
 * supporting pagination and filtering by search keyword and recurrence pattern.
 * Only active (not soft deleted) plans are returned.
 *
 * @param props - Object containing the authenticated regular user and search
 *   criteria
 * @param props.regularUser - Authenticated regular user payload
 * @param props.body - Request body containing search, pagination, and filter
 *   params
 * @returns A paginated list of recurring meal plans belonging to the user
 * @throws {Error} Throws if any unexpected error occurs during data retrieval
 */
export async function patchrecipeSharingRegularUserRecurringMealPlans(props: {
  regularUser: RegularuserPayload;
  body: IRecipeSharingRecurringMealPlans.IRequest;
}): Promise<IPageIRecipeSharingRecurringMealPlans> {
  const { regularUser, body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  const where: {
    owner_user_id: string & tags.Format<"uuid">;
    deleted_at: null;
    name?: { contains: string };
    recurrence_pattern?: string;
  } = {
    owner_user_id: regularUser.id,
    deleted_at: null,
  };

  if (
    body.search !== undefined &&
    body.search !== null &&
    body.search.trim() !== ""
  ) {
    where.name = { contains: body.search };
  }

  if (
    body.recurrence_pattern !== undefined &&
    body.recurrence_pattern !== null
  ) {
    where.recurrence_pattern = body.recurrence_pattern;
  }

  const [data, total] = await Promise.all([
    MyGlobal.prisma.recipe_sharing_recurring_meal_plans.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.recipe_sharing_recurring_meal_plans.count({
      where,
    }),
  ]);

  const mappedData = data.map((record) => ({
    id: record.id as string & tags.Format<"uuid">,
    owner_user_id: record.owner_user_id as string & tags.Format<"uuid">,
    name: record.name,
    description: record.description ?? null,
    recurrence_pattern: record.recurrence_pattern,
    start_date: toISOStringSafe(record.start_date),
    end_date: record.end_date ? toISOStringSafe(record.end_date) : null,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: mappedData,
  };
}
