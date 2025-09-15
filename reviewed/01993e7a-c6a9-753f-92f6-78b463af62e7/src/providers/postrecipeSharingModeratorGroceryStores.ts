import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingGroceryStore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingGroceryStore";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

/**
 * Create new grocery store
 *
 * This function allows a moderator to create a new grocery store record in the
 * system. It requires the store name and accepts optional address, phone, and
 * website URL. It automatically sets audit timestamps and returns the full
 * created entity.
 *
 * @param props - The parameters including moderator payload and grocery store
 *   creation data
 * @param props.moderator - Moderator performing the action
 * @param props.body - Grocery store creation data
 * @returns The created grocery store entity with system fields
 * @throws {Error} Throws if creation fails due to database or validation errors
 */
export async function postrecipeSharingModeratorGroceryStores(props: {
  moderator: ModeratorPayload;
  body: IRecipeSharingGroceryStore.ICreate;
}): Promise<IRecipeSharingGroceryStore> {
  const { body } = props;

  const created = await MyGlobal.prisma.recipe_sharing_grocery_stores.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      name: body.name,
      address: body.address ?? undefined,
      phone: body.phone ?? undefined,
      website_url: body.website_url ?? undefined,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: created.id,
    name: created.name,
    address: created.address ?? null,
    phone: created.phone ?? null,
    website_url: created.website_url ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
