import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingMealPlanEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingMealPlanEntry";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Create a new meal plan entry.
 *
 * This operation allows a regular user to add a new entry to an existing meal
 * plan that they own. It verifies ownership of the meal plan and existence of
 * the recipe before creation.
 *
 * @param props - Object containing the authenticated regular user, meal plan
 *   ID, and the meal plan entry creation data.
 * @param props.regularUser - The authenticated regular user payload.
 * @param props.mealPlanId - The ID of the meal plan to which the entry will be
 *   added.
 * @param props.body - The data for creating the meal plan entry including
 *   recipe ID, quantity, planned date, and meal slot.
 * @returns The newly created meal plan entry with all details including
 *   timestamps and optional soft delete field.
 * @throws {Error} Throws if the meal plan does not exist or is not owned by the
 *   user.
 * @throws {Error} Throws if the referenced recipe does not exist.
 */
export async function postrecipeSharingRegularUserMealPlansMealPlanIdEntries(props: {
  regularUser: RegularuserPayload;
  mealPlanId: string & tags.Format<"uuid">;
  body: IRecipeSharingMealPlanEntry.ICreate;
}): Promise<IRecipeSharingMealPlanEntry> {
  const { regularUser, mealPlanId, body } = props;

  // Verify ownership of meal plan
  await MyGlobal.prisma.recipe_sharing_meal_plans.findFirstOrThrow({
    where: { id: mealPlanId, owner_user_id: regularUser.id },
  });

  // Verify existence of recipe
  await MyGlobal.prisma.recipe_sharing_recipes.findFirstOrThrow({
    where: { id: body.recipe_id },
  });

  // Generate new UUID for meal plan entry with brand
  const id = v4() as string & tags.Format<"uuid">;

  // Get current timestamp in ISO string with brand
  const now = toISOStringSafe(new Date());

  // Create meal plan entry
  const created = await MyGlobal.prisma.recipe_sharing_meal_plan_entries.create(
    {
      data: {
        id,
        meal_plan_id: mealPlanId,
        recipe_id: body.recipe_id,
        quantity: body.quantity,
        planned_date: body.planned_date,
        meal_slot: body.meal_slot,
        created_at: now,
        updated_at: now,
      },
    },
  );

  // Return with date conversion (convert Date to string with toISOStringSafe)
  return {
    id: created.id,
    meal_plan_id: created.meal_plan_id,
    recipe_id: created.recipe_id,
    quantity: created.quantity,
    planned_date: toISOStringSafe(created.planned_date),
    meal_slot: created.meal_slot,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
