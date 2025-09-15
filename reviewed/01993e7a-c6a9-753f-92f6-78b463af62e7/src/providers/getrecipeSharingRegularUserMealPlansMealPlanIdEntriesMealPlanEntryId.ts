import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingMealPlanEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingMealPlanEntry";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Retrieve a meal plan entry for a regular user by mealPlanId and
 * mealPlanEntryId.
 *
 * This operation verifies that the specified meal plan exists and is owned by
 * the authenticated regular user. It then attempts to retrieve the meal plan
 * entry with the provided entry ID, ensuring it belongs to the meal plan and is
 * not soft-deleted.
 *
 * @param props - Object containing the authenticated regular user and IDs
 * @param props.regularUser - The authenticated regular user making the request
 * @param props.mealPlanId - UUID of the meal plan to query
 * @param props.mealPlanEntryId - UUID of the meal plan entry to retrieve
 * @returns The meal plan entry details conforming to
 *   IRecipeSharingMealPlanEntry
 * @throws {Error} If the meal plan is not owned by the user or does not exist
 * @throws {Error} If the meal plan entry does not exist under the specified
 *   meal plan
 */
export async function getrecipeSharingRegularUserMealPlansMealPlanIdEntriesMealPlanEntryId(props: {
  regularUser: RegularuserPayload;
  mealPlanId: string & tags.Format<"uuid">;
  mealPlanEntryId: string & tags.Format<"uuid">;
}): Promise<IRecipeSharingMealPlanEntry> {
  const userId = props.regularUser.id;
  const mealPlanId = props.mealPlanId;
  const mealPlanEntryId = props.mealPlanEntryId;

  // Verify ownership of the meal plan
  const mealPlan = await MyGlobal.prisma.recipe_sharing_meal_plans.findUnique({
    where: { id: mealPlanId },
  });

  if (!mealPlan || mealPlan.owner_user_id !== userId) {
    throw new Error("Unauthorized");
  }

  // Retrieve the meal plan entry under the meal plan ensuring not soft-deleted
  const entry =
    await MyGlobal.prisma.recipe_sharing_meal_plan_entries.findFirst({
      where: {
        id: mealPlanEntryId,
        meal_plan_id: mealPlanId,
        deleted_at: null,
      },
    });

  if (!entry) {
    throw new Error("Meal plan entry not found");
  }

  // Transform all Date fields to ISO string format
  return {
    id: entry.id,
    meal_plan_id: entry.meal_plan_id,
    recipe_id: entry.recipe_id,
    quantity: entry.quantity,
    planned_date: toISOStringSafe(entry.planned_date),
    meal_slot: entry.meal_slot,
    created_at: toISOStringSafe(entry.created_at),
    updated_at: toISOStringSafe(entry.updated_at),
    deleted_at: entry.deleted_at ? toISOStringSafe(entry.deleted_at) : null,
  };
}
