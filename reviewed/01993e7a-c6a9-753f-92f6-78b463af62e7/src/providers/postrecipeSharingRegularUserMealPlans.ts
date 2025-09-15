import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingMealPlan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingMealPlan";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Creates a new meal plan for a regular user.
 *
 * This operation creates a new meal plan record in the
 * `recipe_sharing_meal_plans` table. The meal plan is associated with a
 * specific owner user ID. The name must be unique per user, and the meal plan
 * includes optional description. Creation and update timestamps are recorded
 * automatically.
 *
 * @param props - The properties for this operation.
 * @param props.regularUser - Authenticated regular user's payload.
 * @param props.body - The meal plan creation data.
 * @returns Newly created meal plan details.
 * @throws {Error} When the meal plan name already exists for the user.
 */
export async function postrecipeSharingRegularUserMealPlans(props: {
  regularUser: RegularuserPayload;
  body: IRecipeSharingMealPlan.ICreate;
}): Promise<IRecipeSharingMealPlan> {
  const { regularUser, body } = props;

  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.recipe_sharing_meal_plans.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      owner_user_id: body.owner_user_id,
      name: body.name,
      description: body.description ?? null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    owner_user_id: created.owner_user_id,
    name: created.name,
    description: created.description ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at === null ? null : toISOStringSafe(created.deleted_at),
  };
}
