import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IPageIRecipeSharingMealPlanEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRecipeSharingMealPlanEntry";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Retrieves paginated meal plan entries for a specific meal plan owned by the
 * authenticated regular user.
 *
 * This operation verifies that the meal plan exists and belongs to the
 * requesting user, then fetches active (non-deleted) meal plan entries sorted
 * by planned date. Pagination is applied with a default page of 1 and limit of
 * 20 entries per page. All date fields are properly converted to ISO 8601
 * strings with appropriate branding.
 *
 * @param props - Object containing authenticated regular user and mealPlanId
 * @param props.regularUser - Authenticated regular user payload including user
 *   ID
 * @param props.mealPlanId - UUID of the meal plan to fetch entries for
 * @returns A paginated list of meal plan entries for UI presentation
 * @throws {Error} Unauthorized error if meal plan does not exist or user
 *   unauthorized
 */
export async function patchrecipeSharingRegularUserMealPlansMealPlanIdEntries(props: {
  regularUser: RegularuserPayload;
  mealPlanId: string & tags.Format<"uuid">;
}): Promise<IPageIRecipeSharingMealPlanEntry> {
  const { regularUser, mealPlanId } = props;

  // Verify ownership of meal plan
  const mealPlan = await MyGlobal.prisma.recipe_sharing_meal_plans.findFirst({
    where: {
      id: mealPlanId,
      owner_user_id: regularUser.id,
      deleted_at: null,
    },
  });

  if (!mealPlan) {
    throw new Error("Unauthorized: Meal plan not found or user not owner");
  }

  // Pagination defaults
  const page = 1 as number & tags.Type<"int32"> & tags.Minimum<0> as number;
  const limit = 20 as number & tags.Type<"int32"> & tags.Minimum<0> as number;
  const skip = (page - 1) * limit;

  // Fetch entries and total count
  const [entries, total] = await Promise.all([
    MyGlobal.prisma.recipe_sharing_meal_plan_entries.findMany({
      where: {
        meal_plan_id: mealPlanId,
        deleted_at: null,
      },
      orderBy: { planned_date: "asc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.recipe_sharing_meal_plan_entries.count({
      where: {
        meal_plan_id: mealPlanId,
        deleted_at: null,
      },
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: entries.map((entry) => ({
      id: entry.id,
      meal_plan_id: entry.meal_plan_id,
      recipe_id: entry.recipe_id,
      quantity: entry.quantity,
      planned_date: toISOStringSafe(entry.planned_date),
      meal_slot: entry.meal_slot,
      created_at: toISOStringSafe(entry.created_at),
      updated_at: toISOStringSafe(entry.updated_at),
      deleted_at: entry.deleted_at ? toISOStringSafe(entry.deleted_at) : null,
    })),
  };
}
