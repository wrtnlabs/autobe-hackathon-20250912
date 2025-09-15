import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingCollections } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingCollections";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Retrieve detailed information for a recipe collection using its unique
 * identifier.
 *
 * This function enforces that only the owner (regular user) of the collection
 * can access the details. It throws an error if the collection is not found or
 * if the user is not authorized.
 *
 * @param props - Object containing the authenticated regular user and the
 *   collection ID.
 * @param props.regularUser - The authenticated user who owns the collection.
 * @param props.collectionId - The UUID of the recipe collection to retrieve.
 * @returns The detailed recipe collection information conforming to
 *   IRecipeSharingCollections.
 * @throws {Error} When the collection is not found or the user is not
 *   authorized.
 */
export async function getrecipeSharingRegularUserCollectionsCollectionId(props: {
  regularUser: RegularuserPayload;
  collectionId: string & tags.Format<"uuid">;
}): Promise<IRecipeSharingCollections> {
  const { regularUser, collectionId } = props;

  // Fetch the collection by its unique ID or throw if not found
  const collection =
    await MyGlobal.prisma.recipe_sharing_collections.findUniqueOrThrow({
      where: {
        id: collectionId,
      },
    });

  // Enforce ownership authorization
  if (collection.owner_user_id !== regularUser.id) {
    throw new Error("Not authorized");
  }

  // Return collection data with proper date formatting and nullable/optional handling
  return {
    id: collection.id,
    owner_user_id: collection.owner_user_id,
    name: collection.name,
    description:
      collection.description === null ? undefined : collection.description,
    created_at: toISOStringSafe(collection.created_at),
    updated_at: toISOStringSafe(collection.updated_at),
    deleted_at: collection.deleted_at
      ? toISOStringSafe(collection.deleted_at)
      : null,
  };
}
