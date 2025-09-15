import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Delete an existing meal plan by ID.
 *
 * This operation permanently deletes a meal plan identified by mealPlanId from
 * the recipe_sharing_meal_plans table.
 *
 * Only the authenticated regular or premium user who owns the meal plan is
 * allowed to delete it.
 *
 * @param props - Object containing the authenticated regular user and
 *   mealPlanId.
 * @param props.regularUser - Authenticated regular user payload.
 * @param props.mealPlanId - UUID of the meal plan to delete.
 * @throws {Error} Throws error if the meal plan does not exist.
 * @throws {Error} Throws error if the user is not authorized to delete the meal
 *   plan.
 */
export async function deleterecipeSharingRegularUserMealPlansMealPlanId(props: {
  regularUser: RegularuserPayload;
  mealPlanId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { regularUser, mealPlanId } = props;

  // Fetch the meal plan by id
  const mealPlan = await MyGlobal.prisma.recipe_sharing_meal_plans.findUnique({
    where: { id: mealPlanId },
  });

  if (!mealPlan) {
    throw new Error("Meal plan not found");
  }

  // Check if the requesting user owns the meal plan
  if (mealPlan.owner_user_id !== regularUser.id) {
    throw new Error("Unauthorized: You do not own this meal plan");
  }

  // Perform hard delete
  await MyGlobal.prisma.recipe_sharing_meal_plans.delete({
    where: { id: mealPlanId },
  });
}
