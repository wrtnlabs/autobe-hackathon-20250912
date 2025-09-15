import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Deletes a meal plan entry permanently for the authenticated regular user.
 *
 * This operation verifies ownership of the meal plan and then hard deletes the
 * specified meal plan entry from the database.
 *
 * @param props - Object containing the authenticated regular user payload, the
 *   meal plan ID, and the meal plan entry ID.
 * @param props.regularUser - The authenticated regular user making the request.
 * @param props.mealPlanId - UUID of the meal plan that owns the entry.
 * @param props.mealPlanEntryId - UUID of the meal plan entry to delete.
 * @returns A Promise that resolves when the entry is deleted. No value is
 *   returned.
 * @throws {Error} If the meal plan is not found or does not belong to the user.
 * @throws {Error} If the meal plan entry does not exist.
 */
export async function deleterecipeSharingRegularUserMealPlansMealPlanIdEntriesMealPlanEntryId(props: {
  regularUser: RegularuserPayload;
  mealPlanId: string & tags.Format<"uuid">;
  mealPlanEntryId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { regularUser, mealPlanId, mealPlanEntryId } = props;

  // Verify ownership of the meal plan
  await MyGlobal.prisma.recipe_sharing_meal_plans.findFirstOrThrow({
    where: {
      id: mealPlanId,
      owner_user_id: regularUser.id,
    },
  });

  // Hard delete the meal plan entry by id
  await MyGlobal.prisma.recipe_sharing_meal_plan_entries.delete({
    where: {
      id: mealPlanEntryId,
    },
  });
}
