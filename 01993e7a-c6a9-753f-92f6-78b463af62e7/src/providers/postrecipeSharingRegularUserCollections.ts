import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingCollections } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingCollections";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Create a new recipe collection for the authenticated regular user.
 *
 * This function inserts a new record into the recipe_sharing_collections table,
 * associating the collection with the owner's user ID and provided name and
 * optional description. It ensures all timestamps are set to the current time
 * in ISO 8601 format, and generates a new UUID for the collection ID.
 *
 * @param props - The function parameters
 * @param props.regularUser - The authenticated regular user performing the
 *   creation
 * @param props.body - The creation data containing collection name,
 *   description, and owner user ID
 * @returns The detailed created recipe collection result
 * @throws {Error} Throws if the database create operation fails
 */
export async function postrecipeSharingRegularUserCollections(props: {
  regularUser: RegularuserPayload;
  body: IRecipeSharingCollections.ICreate;
}): Promise<IRecipeSharingCollections> {
  const { regularUser, body } = props;

  const now = toISOStringSafe(new Date());
  const id = v4() as string & tags.Format<"uuid">;

  const created = await MyGlobal.prisma.recipe_sharing_collections.create({
    data: {
      id,
      owner_user_id: body.owner_user_id,
      name: body.name,
      description: body.description ?? null,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id as string & tags.Format<"uuid">,
    owner_user_id: created.owner_user_id as string & tags.Format<"uuid">,
    name: created.name,
    description: created.description ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
