import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingRecurringMealPlan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRecurringMealPlan";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Creates a new recurring meal plan for the authenticated regular user.
 *
 * This operation persists the meal plan details including name, recurrence
 * pattern, start date, optional end date, and description. It generates a UUID
 * for the new plan, sets audit timestamps, and enforces user ownership.
 *
 * @param props - Object containing authenticated regular user and creation body
 * @param props.regularUser - Authenticated regular user providing owner_user_id
 * @param props.body - Recurring meal plan creation details including name,
 *   recurrence pattern, start/end dates
 * @returns The newly created recurring meal plan with all fields
 * @throws {Error} If creation violates uniqueness or validation constraints
 */
export async function postrecipeSharingRegularUserRecurringMealPlans(props: {
  regularUser: RegularuserPayload;
  body: IRecipeSharingRecurringMealPlan.ICreate;
}): Promise<IRecipeSharingRecurringMealPlan> {
  const { regularUser, body } = props;

  const now = toISOStringSafe(new Date());

  const created =
    await MyGlobal.prisma.recipe_sharing_recurring_meal_plans.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        owner_user_id: regularUser.id,
        name: body.name,
        description: body.description ?? null,
        recurrence_pattern: body.recurrence_pattern,
        start_date: body.start_date,
        end_date: body.end_date ?? null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

  return {
    id: created.id,
    owner_user_id: created.owner_user_id,
    name: created.name,
    description: created.description,
    recurrence_pattern: created.recurrence_pattern,
    start_date: toISOStringSafe(created.start_date),
    end_date: created.end_date ? toISOStringSafe(created.end_date) : null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
