import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingRecurringMealPlan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRecurringMealPlan";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Retrieve detailed recurring meal plan information by its unique ID.
 *
 * This function fetches the recurring meal plan from the database if it exists
 * and is not soft-deleted, and ensures the requesting regular user is the
 * owner.
 *
 * @param props - Object containing the authenticated regular user and the
 *   recurring meal plan ID.
 * @param props.regularUser - The authenticated regular user payload containing
 *   user ID.
 * @param props.recurringMealPlanId - The UUID of the recurring meal plan to
 *   retrieve.
 * @returns The recurring meal plan matching the ID, fully populated.
 * @throws {Error} When the recurring meal plan is not found or has been soft
 *   deleted.
 * @throws {Error} When the requesting user is not the owner of the recurring
 *   meal plan.
 */
export async function getrecipeSharingRegularUserRecurringMealPlansRecurringMealPlanId(props: {
  regularUser: RegularuserPayload;
  recurringMealPlanId: string & tags.Format<"uuid">;
}): Promise<IRecipeSharingRecurringMealPlan> {
  const { regularUser, recurringMealPlanId } = props;

  const recurringMealPlan =
    await MyGlobal.prisma.recipe_sharing_recurring_meal_plans.findUnique({
      where: { id: recurringMealPlanId },
    });

  if (!recurringMealPlan || recurringMealPlan.deleted_at !== null) {
    throw new Error("Recurring meal plan not found or has been deleted.");
  }

  if (recurringMealPlan.owner_user_id !== regularUser.id) {
    throw new Error("Unauthorized: You do not own this recurring meal plan.");
  }

  return {
    id: recurringMealPlan.id,
    owner_user_id: recurringMealPlan.owner_user_id,
    name: recurringMealPlan.name,
    description: recurringMealPlan.description ?? null,
    recurrence_pattern: recurringMealPlan.recurrence_pattern,
    start_date: toISOStringSafe(recurringMealPlan.start_date),
    end_date: recurringMealPlan.end_date
      ? toISOStringSafe(recurringMealPlan.end_date)
      : null,
    created_at: toISOStringSafe(recurringMealPlan.created_at),
    updated_at: toISOStringSafe(recurringMealPlan.updated_at),
    deleted_at: recurringMealPlan.deleted_at
      ? toISOStringSafe(recurringMealPlan.deleted_at)
      : null,
  };
}
