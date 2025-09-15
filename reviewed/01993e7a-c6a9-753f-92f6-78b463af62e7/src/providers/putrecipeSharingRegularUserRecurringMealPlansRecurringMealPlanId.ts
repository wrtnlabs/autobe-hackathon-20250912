import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingRecurringMealPlan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRecurringMealPlan";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Update an existing recurring meal plan by ID with new scheduling details.
 *
 * This function verifies user ownership, validates input data for uniqueness
 * and date consistency, updates the database record, and returns the updated
 * recurring meal plan data.
 *
 * @param props - Object containing the authenticated user, recurring meal plan
 *   ID, and update data.
 * @returns The updated recurring meal plan entity.
 * @throws {Error} Throws if unauthorized, not found, or validation errors
 *   occur.
 */
export async function putrecipeSharingRegularUserRecurringMealPlansRecurringMealPlanId(props: {
  regularUser: RegularuserPayload;
  recurringMealPlanId: string & tags.Format<"uuid">;
  body: IRecipeSharingRecurringMealPlan.IUpdate;
}): Promise<IRecipeSharingRecurringMealPlan> {
  const { regularUser, recurringMealPlanId, body } = props;

  // Fetch the recurring meal plan record using the provided ID
  const plan =
    await MyGlobal.prisma.recipe_sharing_recurring_meal_plans.findUniqueOrThrow(
      {
        where: { id: recurringMealPlanId },
      },
    );

  // Authorization: Ensure the current user owns the plan
  if (plan.owner_user_id !== regularUser.id) {
    throw new Error("Unauthorized: You do not own this recurring meal plan.");
  }

  // Check if the plan is soft-deleted
  if (plan.deleted_at !== null) {
    throw new Error("Not found: The recurring meal plan is deleted.");
  }

  // Validate name uniqueness if name is changed
  if (
    body.name !== undefined &&
    body.name !== null &&
    body.name !== plan.name
  ) {
    const existing =
      await MyGlobal.prisma.recipe_sharing_recurring_meal_plans.findFirst({
        where: {
          owner_user_id: regularUser.id,
          name: body.name,
          deleted_at: null,
          id: { not: recurringMealPlanId },
        },
      });
    if (existing) {
      throw new Error(
        "Validation failed: Recurring meal plan name must be unique per user.",
      );
    }
  }

  // Validate date consistency if both dates are provided
  if (body.start_date !== undefined && body.end_date !== undefined) {
    if (
      body.end_date !== null &&
      body.start_date !== null &&
      body.start_date > body.end_date
    ) {
      throw new Error(
        "Validation failed: start_date must be before or equal to end_date.",
      );
    }
  }

  // Prepare data for update
  const now = toISOStringSafe(new Date());
  const updateData = {
    ...(body.name !== undefined ? { name: body.name } : {}),
    ...(body.description !== undefined
      ? { description: body.description }
      : {}),
    ...(body.recurrence_pattern !== undefined
      ? { recurrence_pattern: body.recurrence_pattern }
      : {}),
    ...(body.start_date !== undefined ? { start_date: body.start_date } : {}),
    ...(body.end_date !== undefined ? { end_date: body.end_date } : {}),
    updated_at: now,
  };

  // Perform the update in database
  const updated =
    await MyGlobal.prisma.recipe_sharing_recurring_meal_plans.update({
      where: { id: recurringMealPlanId },
      data: updateData,
    });

  // Return updated plan with proper date-time string conversions
  return {
    id: updated.id,
    owner_user_id: updated.owner_user_id,
    name: updated.name,
    description: updated.description ?? null,
    recurrence_pattern: updated.recurrence_pattern,
    start_date: toISOStringSafe(updated.start_date),
    end_date: updated.end_date ? toISOStringSafe(updated.end_date) : null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
