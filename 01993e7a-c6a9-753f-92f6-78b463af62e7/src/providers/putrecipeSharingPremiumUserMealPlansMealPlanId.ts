import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingMealPlan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingMealPlan";
import { PremiumuserPayload } from "../decorators/payload/PremiumuserPayload";

/**
 * Update an existing meal plan by ID
 *
 * This operation updates the details of a meal plan, such as name and
 * description. Authorization requires the authenticated premium user to own the
 * meal plan. Validation ensures the new name is unique for the user.
 *
 * @param props - The parameters including the authorized premium user, the meal
 *   plan ID, and the update body containing name and optional description.
 * @returns The updated meal plan details including timestamps and soft delete
 *   status.
 * @throws {Error} When the meal plan is not found.
 * @throws {Error} When the user is not authorized to update this meal plan.
 * @throws {Error} When the new meal plan name conflicts with an existing one
 *   for the user.
 */
export async function putrecipeSharingPremiumUserMealPlansMealPlanId(props: {
  premiumUser: PremiumuserPayload;
  mealPlanId: string & tags.Format<"uuid">;
  body: IRecipeSharingMealPlan.IUpdate;
}): Promise<IRecipeSharingMealPlan> {
  const { premiumUser, mealPlanId, body } = props;

  const existing = await MyGlobal.prisma.recipe_sharing_meal_plans.findUnique({
    where: { id: mealPlanId },
  });

  if (!existing) {
    throw new Error("Meal plan not found");
  }

  if (existing.owner_user_id !== premiumUser.id) {
    throw new Error("Unauthorized: You do not own this meal plan");
  }

  const conflicting = await MyGlobal.prisma.recipe_sharing_meal_plans.findFirst(
    {
      where: {
        owner_user_id: premiumUser.id,
        name: { equals: body.name },
        id: { not: mealPlanId },
      },
    },
  );

  if (conflicting) {
    throw new Error("Conflict: Meal plan name already exists for this user");
  }

  const now = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.recipe_sharing_meal_plans.update({
    where: { id: mealPlanId },
    data: {
      name: body.name,
      description: body.description ?? null,
      updated_at: now,
    },
  });

  return {
    id: updated.id,
    owner_user_id: updated.owner_user_id,
    name: updated.name,
    description: updated.description ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
