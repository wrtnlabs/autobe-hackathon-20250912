import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingTags } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingTags";
import { PremiumuserPayload } from "../decorators/payload/PremiumuserPayload";

/**
 * Create a new recipe tag for premium users.
 *
 * Inserts a new unique tag record into the database using the provided tag name
 * and optional description. Timestamps for creation and update are set to the
 * current time.
 *
 * @param props - Object containing the authenticated premium user and tag
 *   creation data
 * @param props.premiumUser - Authenticated premium user payload initiating the
 *   creation
 * @param props.body - Tag creation data, including required name and optional
 *   description
 * @returns The newly created tag record with id, name, description, created_at,
 *   and updated_at
 * @throws Error if tag creation fails, e.g., due to duplicate name
 */
export async function postrecipeSharingPremiumUserTags(props: {
  premiumUser: PremiumuserPayload;
  body: IRecipeSharingTags.ICreate;
}): Promise<IRecipeSharingTags> {
  const { premiumUser, body } = props;

  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.recipe_sharing_tags.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      name: body.name,
      description: body.description ?? undefined,
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
