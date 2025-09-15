import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IPageIRecipeSharingMealPlanEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRecipeSharingMealPlanEntry";
import { PremiumuserPayload } from "../decorators/payload/PremiumuserPayload";

/**
 * List meal plan entries for a meal plan.
 *
 * Retrieves paginated meal plan entries for the specified meal plan identified
 * by `mealPlanId`. Authorization requires the authenticated premium user to own
 * the meal plan to access its entries.
 *
 * @param props - Object containing premiumUser authentication and mealPlanId
 * @param props.premiumUser - The authenticated premium user payload
 * @param props.mealPlanId - UUID of the meal plan whose entries to fetch
 * @returns A paginated list of meal plan entries conforming to
 *   IPageIRecipeSharingMealPlanEntry interface
 * @throws {Error} Throws if the meal plan does not exist or the user is
 *   unauthorized
 */
export async function patchrecipeSharingPremiumUserMealPlansMealPlanIdEntries(props: {
  premiumUser: PremiumuserPayload;
  mealPlanId: string & tags.Format<"uuid">;
}): Promise<IPageIRecipeSharingMealPlanEntry> {
  const { premiumUser, mealPlanId } = props;

  // Fetch meal plan and verify ownership
  const mealPlan =
    await MyGlobal.prisma.recipe_sharing_meal_plans.findUniqueOrThrow({
      where: { id: mealPlanId },
    });

  if (mealPlan.owner_user_id !== premiumUser.id) {
    throw new Error("Unauthorized: You do not own this meal plan");
  }

  // Pagination fixed parameters
  const page = 1 as number & tags.Type<"int32"> & tags.Minimum<0>;
  const limit = 20 as number & tags.Type<"int32"> & tags.Minimum<0>;
  const skip = (page - 1) * limit;

  // Count total meal plan entries (exclude soft deleted)
  const total = await MyGlobal.prisma.recipe_sharing_meal_plan_entries.count({
    where: {
      meal_plan_id: mealPlanId,
      deleted_at: null,
    },
  });

  // Fetch paginated entries
  const entries =
    await MyGlobal.prisma.recipe_sharing_meal_plan_entries.findMany({
      where: {
        meal_plan_id: mealPlanId,
        deleted_at: null,
      },
      orderBy: {
        planned_date: "asc",
      },
      skip,
      take: limit,
    });

  // Map to paginated data format
  const data = entries.map((entry) => ({
    id: entry.id,
    meal_plan_id: entry.meal_plan_id,
    recipe_id: entry.recipe_id,
    quantity: entry.quantity,
    planned_date: toISOStringSafe(entry.planned_date),
    meal_slot: entry.meal_slot,
    created_at: toISOStringSafe(entry.created_at),
    updated_at: toISOStringSafe(entry.updated_at),
    deleted_at: entry.deleted_at ? toISOStringSafe(entry.deleted_at) : null,
  }));

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
