import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingMealPlan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingMealPlan";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Update an existing meal plan by ID
 *
 * This function updates the name and description of the meal plan identified by
 * the given mealPlanId. It performs authorization by ensuring the requesting
 * regular user owns the meal plan. It also checks for name uniqueness per
 * owner. All timestamps are stored and returned in ISO 8601 string format.
 *
 * @param props - Object containing the regular user info, mealPlanId path
 *   parameter, and request body with updated meal plan information.
 * @param props.regularUser - Authenticated regular user.
 * @param props.mealPlanId - UUID of the meal plan to update.
 * @param props.body - Updated meal plan data (name and optional description).
 * @returns The updated meal plan object.
 * @throws {Error} When meal plan not found.
 * @throws {Error} When unauthorized user attempts update.
 * @throws {Error} When meal plan name conflicts with existing plan for owner.
 */
export async function putrecipeSharingRegularUserMealPlansMealPlanId(props: {
  regularUser: RegularuserPayload;
  mealPlanId: string & tags.Format<"uuid">;
  body: IRecipeSharingMealPlan.IUpdate;
}): Promise<IRecipeSharingMealPlan> {
  const { regularUser, mealPlanId, body } = props;

  // Fetch the meal plan (active only)
  const mealPlan = await MyGlobal.prisma.recipe_sharing_meal_plans.findFirst({
    where: {
      id: mealPlanId,
      deleted_at: null,
    },
  });

  if (!mealPlan) throw new Error("Meal plan not found");

  if (mealPlan.owner_user_id !== regularUser.id) {
    throw new Error("Unauthorized to update this meal plan");
  }

  // Check name uniqueness
  const existingName =
    await MyGlobal.prisma.recipe_sharing_meal_plans.findFirst({
      where: {
        owner_user_id: regularUser.id,
        name: body.name,
        id: { not: mealPlanId },
        deleted_at: null,
      },
    });

  if (existingName) {
    throw new Error("Meal plan name already exists for this owner");
  }

  const updatedAt = toISOStringSafe(new Date());

  // Update meal plan
  const updated = await MyGlobal.prisma.recipe_sharing_meal_plans.update({
    where: { id: mealPlanId },
    data: {
      name: body.name,
      description: body.description ?? null,
      updated_at: updatedAt,
    },
    select: {
      id: true,
      owner_user_id: true,
      name: true,
      description: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });

  return {
    id: updated.id as string & tags.Format<"uuid">,
    owner_user_id: updated.owner_user_id as string & tags.Format<"uuid">,
    name: updated.name,
    description: updated.description ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
