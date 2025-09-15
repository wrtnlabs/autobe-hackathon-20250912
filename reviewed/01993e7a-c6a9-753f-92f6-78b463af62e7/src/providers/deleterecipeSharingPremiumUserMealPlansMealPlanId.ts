import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { PremiumuserPayload } from "../decorators/payload/PremiumuserPayload";

/**
 * Delete an existing meal plan by ID
 *
 * This operation permanently removes a meal plan identified by the mealPlanId
 * path parameter from the recipe_sharing_meal_plans table. Only the
 * authenticated premium user owner of the meal plan can perform this deletion.
 *
 * @param props - Object containing the authenticated premium user and the meal
 *   plan ID
 * @param props.premiumUser - The authenticated premium user performing the
 *   deletion
 * @param props.mealPlanId - The UUID of the meal plan to delete
 * @throws {Error} Throws if the meal plan does not exist or if the user is
 *   unauthorized
 */
export async function deleterecipeSharingPremiumUserMealPlansMealPlanId(props: {
  premiumUser: PremiumuserPayload;
  mealPlanId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { premiumUser, mealPlanId } = props;

  const mealPlan =
    await MyGlobal.prisma.recipe_sharing_meal_plans.findUniqueOrThrow({
      where: { id: mealPlanId },
      select: { id: true, owner_user_id: true },
    });

  if (mealPlan.owner_user_id !== premiumUser.id) {
    throw new Error("Unauthorized: You can only delete your own meal plans");
  }

  await MyGlobal.prisma.recipe_sharing_meal_plans.delete({
    where: { id: mealPlanId },
  });
}
