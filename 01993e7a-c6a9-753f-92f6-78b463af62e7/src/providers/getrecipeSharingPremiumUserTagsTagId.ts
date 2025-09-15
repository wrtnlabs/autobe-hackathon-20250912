import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingTags } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingTags";
import { PremiumuserPayload } from "../decorators/payload/PremiumuserPayload";

/**
 * Get recipe tag details by ID
 *
 * Retrieves a single recipe tag's detailed information identified by tagId.
 * Access is restricted to authenticated premium users.
 *
 * @param props - Object containing the authenticated premium user payload and
 *   tag ID
 * @param props.premiumUser - Authenticated premium user making the request
 * @param props.tagId - Unique identifier of the recipe tag to retrieve
 * @returns Detailed recipe tag information including name, description,
 *   created_at, and updated_at
 * @throws {Error} When no recipe tag is found with the given tagId
 */
export async function getrecipeSharingPremiumUserTagsTagId(props: {
  premiumUser: PremiumuserPayload;
  tagId: string & tags.Format<"uuid">;
}): Promise<IRecipeSharingTags> {
  const { tagId } = props;

  const tag = await MyGlobal.prisma.recipe_sharing_tags.findUniqueOrThrow({
    where: { id: tagId },
  });

  return {
    id: tag.id,
    name: tag.name,
    description: tag.description ?? null,
    created_at: toISOStringSafe(tag.created_at),
    updated_at: toISOStringSafe(tag.updated_at),
  };
}
