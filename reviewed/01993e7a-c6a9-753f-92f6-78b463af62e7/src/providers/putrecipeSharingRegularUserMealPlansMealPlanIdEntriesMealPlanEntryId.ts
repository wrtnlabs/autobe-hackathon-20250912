import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingMealPlanEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingMealPlanEntry";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Updates an existing meal plan entry by mealPlanId and mealPlanEntryId.
 *
 * Allows updating recipe ID, quantity, planned date, and meal slot. Requires
 * that the requesting regular user owns the meal plan.
 *
 * @param props - Object containing authenticated user, IDs, and update body.
 * @param props.regularUser - Authenticated regular user attempting update.
 * @param props.mealPlanId - UUID of the meal plan.
 * @param props.mealPlanEntryId - UUID of the meal plan entry.
 * @param props.body - Update data for the meal plan entry.
 * @returns The updated meal plan entry with all date fields as ISO strings.
 * @throws {Error} If the meal plan or entry does not exist or user is
 *   unauthorized.
 */
export async function putrecipeSharingRegularUserMealPlansMealPlanIdEntriesMealPlanEntryId(props: {
  regularUser: RegularuserPayload;
  mealPlanId: string & tags.Format<"uuid">;
  mealPlanEntryId: string & tags.Format<"uuid">;
  body: IRecipeSharingMealPlanEntry.IUpdate;
}): Promise<IRecipeSharingMealPlanEntry> {
  const { regularUser, mealPlanId, mealPlanEntryId, body } = props;

  const existingEntry =
    await MyGlobal.prisma.recipe_sharing_meal_plan_entries.findUniqueOrThrow({
      where: { id: mealPlanEntryId },
      include: { mealPlan: true },
    });

  if (existingEntry.mealPlan.owner_user_id !== regularUser.id) {
    throw new Error("Unauthorized: You do not own this meal plan entry");
  }

  const updateData: IRecipeSharingMealPlanEntry.IUpdate = {};

  if (body.meal_plan_id !== undefined) {
    updateData.meal_plan_id =
      body.meal_plan_id === null ? null : body.meal_plan_id;
  }
  if (body.recipe_id !== undefined) {
    updateData.recipe_id = body.recipe_id === null ? null : body.recipe_id;
  }
  if (body.quantity !== undefined) {
    updateData.quantity = body.quantity === null ? null : body.quantity;
  }
  if (body.planned_date !== undefined) {
    updateData.planned_date =
      body.planned_date === null ? null : toISOStringSafe(body.planned_date);
  }
  if (body.meal_slot !== undefined) {
    updateData.meal_slot = body.meal_slot === null ? null : body.meal_slot;
  }

  const updated = await MyGlobal.prisma.recipe_sharing_meal_plan_entries.update(
    {
      where: { id: mealPlanEntryId },
      data: updateData,
    },
  );

  return {
    id: updated.id as string & tags.Format<"uuid">,
    meal_plan_id: updated.meal_plan_id as string & tags.Format<"uuid">,
    recipe_id: updated.recipe_id as string & tags.Format<"uuid">,
    quantity: updated.quantity as number & tags.Type<"int32">,
    planned_date: toISOStringSafe(updated.planned_date),
    meal_slot: updated.meal_slot,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
