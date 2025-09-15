import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingMealPlan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingMealPlan";
import { PremiumuserPayload } from "../decorators/payload/PremiumuserPayload";

/**
 * Creates a new meal plan for a premium user.
 *
 * This operation inserts a new record into the `recipe_sharing_meal_plans`
 * table with the provided owner user ID, meal plan name, and optional
 * description. It automatically generates a new UUID for the meal plan, sets
 * timestamps for creation and update, and initializes the soft delete field to
 * null.
 *
 * Authorization is required via the `premiumUser` payload.
 *
 * @param props - Object containing the premium user payload and meal plan
 *   creation data
 * @param props.premiumUser - Authenticated premium user making the request
 * @param props.body - Data required to create the meal plan including owner ID,
 *   name, and description
 * @returns The newly created meal plan with all properties
 * @throws {Error} Throws if there is a database error such as a unique
 *   constraint violation
 */
export async function postrecipeSharingPremiumUserMealPlans(props: {
  premiumUser: PremiumuserPayload;
  body: IRecipeSharingMealPlan.ICreate;
}): Promise<IRecipeSharingMealPlan> {
  const now = toISOStringSafe(new Date());
  const id = v4() as string & tags.Format<"uuid">;

  const created = await MyGlobal.prisma.recipe_sharing_meal_plans.create({
    data: {
      id: id,
      owner_user_id: props.body.owner_user_id,
      name: props.body.name,
      description: props.body.description ?? null,
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
    created_at: created.created_at as string & tags.Format<"date-time">,
    updated_at: created.updated_at as string & tags.Format<"date-time">,
    deleted_at: created.deleted_at ?? null,
  };
}
