import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingTags } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingTags";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Create a new recipe tag with a unique name and optional description.
 *
 * This operation inserts a new record in the recipe_sharing_tags table using
 * the provided tag name and an optional description.
 *
 * Authorization requires the authenticated regular user making the request.
 *
 * @param props - Object containing the authenticated regular user and request
 *   body
 * @param props.regularUser - The authenticated regular user payload
 * @param props.body - Request body with tag creation data: name (required) and
 *   description (optional)
 * @returns The newly created recipe tag with all its fields including id and
 *   timestamps
 * @throws {Error} Throws an error if the database operation fails or tag name
 *   violates unique constraints
 */
export async function postrecipeSharingRegularUserTags(props: {
  regularUser: RegularuserPayload;
  body: IRecipeSharingTags.ICreate;
}): Promise<IRecipeSharingTags> {
  const id = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.recipe_sharing_tags.create({
    data: {
      id: id,
      name: props.body.name,
      description: props.body.description ?? null,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id,
    name: created.name,
    description: created.description ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
