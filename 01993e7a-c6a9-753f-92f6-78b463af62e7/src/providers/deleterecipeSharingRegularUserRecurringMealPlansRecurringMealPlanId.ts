import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Permanently deletes a recurring meal plan from the system identified by the
 * recurringMealPlanId.
 *
 * This operation performs a hard delete on the
 * recipe_sharing_recurring_meal_plans table.
 *
 * It verifies the authenticated regular user's ownership of the meal plan prior
 * to deletion.
 *
 * @param props - Object containing the regular user payload and recurring meal
 *   plan ID.
 * @param props.regularUser - Authenticated regular user performing the
 *   deletion.
 * @param props.recurringMealPlanId - The UUID of the recurring meal plan to
 *   delete.
 * @throws {Error} Throws an error if the recurring meal plan does not exist or
 *   user is not authorized.
 */
export async function deleterecipeSharingRegularUserRecurringMealPlansRecurringMealPlanId(props: {
  regularUser: RegularuserPayload;
  recurringMealPlanId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { regularUser, recurringMealPlanId } = props;

  const mealPlan =
    await MyGlobal.prisma.recipe_sharing_recurring_meal_plans.findFirst({
      where: {
        id: recurringMealPlanId,
        owner_user_id: regularUser.id,
      },
    });

  if (!mealPlan) {
    throw new Error("Unauthorized or recurring meal plan not found");
  }

  await MyGlobal.prisma.recipe_sharing_recurring_meal_plans.delete({
    where: {
      id: recurringMealPlanId,
    },
  });
}
