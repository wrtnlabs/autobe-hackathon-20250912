import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Permanently remove a user collection by its unique identifier.
 *
 * This operation performs a hard delete on the collection record identified by
 * collectionId. Ownership verification is enforced to allow only the owner user
 * to delete their collection.
 *
 * No content body is returned on success.
 *
 * @param props - Object containing the authenticated regular user and the
 *   collection ID to delete
 * @param props.regularUser - The authenticated regular user performing the
 *   deletion
 * @param props.collectionId - The unique identifier of the collection to delete
 * @throws {Error} Throws an error if the collection does not belong to the user
 * @throws {Error} Throws if no collection with the given ID exists
 */
export async function deleterecipeSharingRegularUserCollectionsCollectionId(props: {
  regularUser: RegularuserPayload;
  collectionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { regularUser, collectionId } = props;

  const collection =
    await MyGlobal.prisma.recipe_sharing_collections.findUniqueOrThrow({
      where: { id: collectionId },
    });

  if (collection.owner_user_id !== regularUser.id) {
    throw new Error("Unauthorized: You do not own this collection");
  }

  await MyGlobal.prisma.recipe_sharing_collections.delete({
    where: { id: collectionId },
  });
}
