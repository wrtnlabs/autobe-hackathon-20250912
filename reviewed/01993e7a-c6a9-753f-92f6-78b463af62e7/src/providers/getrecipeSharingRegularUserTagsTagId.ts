import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingTags } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingTags";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Get recipe tag details by ID
 *
 * Retrieves detailed tag information from the recipe_sharing_tags table for a
 * given tagId. Requires authentication via regularUser. Throws if the tag does
 * not exist.
 *
 * @param props - Object containing the authenticated regular user and the tag
 *   ID.
 * @param props.regularUser - Authenticated regular user payload
 * @param props.tagId - UUID of the tag to retrieve
 * @returns Detailed information of the requested recipe tag
 * @throws {Error} When no tag with the specified ID exists
 */
export async function getrecipeSharingRegularUserTagsTagId(props: {
  regularUser: RegularuserPayload;
  tagId: string & tags.Format<"uuid">;
}): Promise<IRecipeSharingTags> {
  const { regularUser, tagId } = props;

  const tag = await MyGlobal.prisma.recipe_sharing_tags.findUniqueOrThrow({
    where: { id: tagId },
    select: {
      id: true,
      name: true,
      description: true,
      created_at: true,
      updated_at: true,
    },
  });

  return {
    id: tag.id,
    name: tag.name,
    description: tag.description ?? undefined,
    created_at: toISOStringSafe(tag.created_at),
    updated_at: toISOStringSafe(tag.updated_at),
  };
}
