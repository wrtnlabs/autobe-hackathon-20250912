import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingPersonalizedFeed } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingPersonalizedFeed";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Create a new personalized feed entry for a regular user.
 *
 * This operation inserts a new record in the recipe_sharing_personalized_feeds
 * table, linking a user feed with a specific recipe and its originator user.
 *
 * It enforces that the authenticated regular user's ID matches the user_id in
 * the creation payload to maintain security.
 *
 * Timestamps for creation and update are automatically set to the current UTC
 * time in ISO 8601 format.
 *
 * @param props - The function parameters, including the authenticated regular
 *   user and the creation payload.
 * @param props.regularUser - The authenticated regular user.
 * @param props.body - The data required to create a personalized feed entry.
 * @returns The newly created personalized feed entry with all fields.
 * @throws {Error} When the authenticated user ID does not match the
 *   body.user_id.
 */
export async function postrecipeSharingRegularUserPersonalizedFeeds(props: {
  regularUser: RegularuserPayload;
  body: IRecipeSharingPersonalizedFeed.ICreate;
}): Promise<IRecipeSharingPersonalizedFeed> {
  const { regularUser, body } = props;

  if (regularUser.id !== body.user_id) {
    throw new Error(
      "Unauthorized: regular user ID does not match user_id in body",
    );
  }

  const now = toISOStringSafe(new Date());

  const id = v4() as string & tags.Format<"uuid">;

  const created =
    await MyGlobal.prisma.recipe_sharing_personalized_feeds.create({
      data: {
        id,
        user_id: body.user_id,
        recipe_id: body.recipe_id,
        originator_user_id: body.originator_user_id,
        created_at: now,
        updated_at: now,
      },
    });

  return {
    id: created.id,
    user_id: created.user_id,
    recipe_id: created.recipe_id,
    originator_user_id: created.originator_user_id,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
