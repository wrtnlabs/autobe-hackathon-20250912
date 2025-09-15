import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingMealPlans } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingMealPlans";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Retrieve detailed information of a specific meal plan by its unique
 * identifier.
 *
 * This includes meal plan metadata such as name, description, ownership, and
 * audit timestamps. Access is restricted to the owner of the meal plan to
 * ensure privacy.
 *
 * @param props - Input parameters including authenticated regular user payload
 *   and mealPlanId
 * @param props.regularUser - Authenticated regular user making the request
 * @param props.mealPlanId - Unique identifier of the target meal plan
 * @returns Promise resolving to the meal plan information conforming to
 *   IRecipeSharingMealPlans
 * @throws {Error} When the meal plan does not exist or when the user is
 *   unauthorized
 */
export async function getrecipeSharingRegularUserMealPlansMealPlanId(props: {
  regularUser: RegularuserPayload;
  mealPlanId: string & tags.Format<"uuid">;
}): Promise<IRecipeSharingMealPlans> {
  const { regularUser, mealPlanId } = props;

  // Fetch the meal plan ensuring it is active (not soft deleted)
  const mealPlan =
    await MyGlobal.prisma.recipe_sharing_meal_plans.findFirstOrThrow({
      where: {
        id: mealPlanId,
        owner_user_id: regularUser.id,
        deleted_at: null,
      },
    });

  // Return all fields with proper date conversion and null handling
  return {
    id: mealPlan.id,
    owner_user_id: mealPlan.owner_user_id,
    name: mealPlan.name,
    description: mealPlan.description ?? null,
    created_at: toISOStringSafe(mealPlan.created_at),
    updated_at: toISOStringSafe(mealPlan.updated_at),
    deleted_at: mealPlan.deleted_at
      ? toISOStringSafe(mealPlan.deleted_at)
      : null,
  };
}
