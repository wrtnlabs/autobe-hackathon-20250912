import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingCollections } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingCollections";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Update an existing user collection in the Recipe Sharing backend system.
 *
 * This function updates the collection's name and optional description by
 * verifying that the collection exists, belongs to the requesting regular user,
 * and is not soft-deleted.
 *
 * @param props - Object containing the regular user payload, collection ID, and
 *   update data.
 * @param props.regularUser - Authenticated regular user making the request.
 * @param props.collectionId - UUID of the collection to update.
 * @param props.body - Update data for the collection, including optional name
 *   and description.
 * @returns The updated collection entity with all fields populated.
 * @throws {Error} When no collection is found matching the criteria or the user
 *   is unauthorized.
 */
export async function putrecipeSharingRegularUserCollectionsCollectionId(props: {
  regularUser: RegularuserPayload;
  collectionId: string & import("typia").tags.Format<"uuid">;

  body: IRecipeSharingCollections.IUpdate;
}): Promise<IRecipeSharingCollections> {
  const { regularUser, collectionId, body } = props;

  // Verify ownership and existence of active collection
  const collection = await MyGlobal.prisma.recipe_sharing_collections.findFirst(
    {
      where: {
        id: collectionId,
        owner_user_id: regularUser.id,
        deleted_at: null,
      },
    },
  );

  if (!collection) {
    throw new Error("Collection not found or unauthorized");
  }

  // Current timestamp for update
  const now: string & import("typia").tags.Format<"date-time"> =
    toISOStringSafe(new Date());

  // Perform update with only allowed fields
  const updated = await MyGlobal.prisma.recipe_sharing_collections.update({
    where: { id: collectionId },
    data: {
      name: body.name ?? undefined,
      description: body.description ?? undefined,
      updated_at: now,
    },
  });

  // Return updated collection with proper date formatting
  return {
    id: updated.id,
    owner_user_id: updated.owner_user_id,
    name: updated.name,
    description: updated.description ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: now,
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
