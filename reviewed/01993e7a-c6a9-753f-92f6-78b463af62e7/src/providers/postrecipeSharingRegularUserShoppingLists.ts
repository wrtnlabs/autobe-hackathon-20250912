import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingShoppingList } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingShoppingList";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Creates a new recipe sharing shopping list for an authenticated regular user.
 *
 * This function validates that the user_id in the body matches the
 * authenticated user. It then creates a new shopping list record in the
 * database with timestamps and soft deletion support.
 *
 * @param props - The input properties containing the authenticated user and
 *   shopping list details.
 * @param props.regularUser - The authenticated regular user payload.
 * @param props.body - The shopping list creation details containing user_id and
 *   name.
 * @returns The newly created shopping list conforming to
 *   IRecipeSharingShoppingList.
 * @throws {Error} Throws if user_id does not match the authenticated user.
 */
export async function postrecipeSharingRegularUserShoppingLists(props: {
  regularUser: RegularuserPayload;
  body: IRecipeSharingShoppingList.ICreate;
}): Promise<IRecipeSharingShoppingList> {
  const { regularUser, body } = props;

  if (regularUser.id !== body.user_id) {
    throw new Error(
      "Unauthorized: user_id in body does not match authenticated user",
    );
  }

  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.recipe_sharing_shopping_lists.create({
    data: {
      id: v4(),
      user_id: body.user_id,
      name: body.name,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    user_id: created.user_id,
    name: created.name,
    created_at: created.created_at,
    updated_at: created.updated_at,
    deleted_at: null,
  };
}
