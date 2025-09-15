import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingUserTags } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingUserTags";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Create a new user tag suggestion.
 *
 * This operation allows an authenticated regular user to create a new
 * user-generated tag suggestion in the recipe sharing system. It stores the
 * submitting user ID, an optional approved tag ID, the suggested tag name, and
 * moderation status set to "pending". The creation and update timestamps are
 * set to the current time.
 *
 * @param props - Object containing the authenticated regular user and the user
 *   tag creation payload.
 * @param props.regularUser - The authenticated regular user making the request.
 * @param props.body - The user tag suggestion creation data including user_id,
 *   optional tag_id, suggested_name, and status.
 * @returns The newly created user tag suggestion record, including all stored
 *   fields and timestamps.
 * @throws {Error} Throws error if the creation fails due to database or other
 *   issues.
 */
export async function postrecipeSharingRegularUserUserTags(props: {
  regularUser: RegularuserPayload;
  body: IRecipeSharingUserTags.ICreate;
}): Promise<IRecipeSharingUserTags> {
  const { regularUser, body } = props;

  const id = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.recipe_sharing_user_tags.create({
    data: {
      id: id,
      user_id: body.user_id,
      tag_id: body.tag_id ?? null,
      suggested_name: body.suggested_name,
      status: "pending",
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id,
    user_id: created.user_id,
    tag_id: created.tag_id ?? null,
    suggested_name: created.suggested_name,
    status: created.status as "pending" | "approved" | "rejected",
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
