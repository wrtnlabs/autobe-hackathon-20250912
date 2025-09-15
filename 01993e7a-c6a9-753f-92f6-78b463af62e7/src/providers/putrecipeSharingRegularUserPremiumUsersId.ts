import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingPremiumUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingPremiumUser";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Updates the profile details of a premium user.
 *
 * This operation is authorized for the user themselves only.
 *
 * Updates allowed fields: email, username, premium_since. Password and deletion
 * fields are not modifiable.
 *
 * @param props - Object containing regularUser authentication info, target
 *   premium user ID, and update body.
 * @returns The updated premium user info excluding password hashes.
 * @throws {Error} If unauthorized access attempt occurs.
 * @throws {Error} If premium user is not found.
 */
export async function putrecipeSharingRegularUserPremiumUsersId(props: {
  regularUser: RegularuserPayload;
  id: string & tags.Format<"uuid">;
  body: IRecipeSharingPremiumUser.IUpdate;
}): Promise<IRecipeSharingPremiumUser> {
  if (props.regularUser.id !== props.id) {
    throw new Error(
      "Unauthorized access: cannot update another user's premium profile.",
    );
  }

  const existing =
    await MyGlobal.prisma.recipe_sharing_premiumusers.findUniqueOrThrow({
      where: { id: props.id },
    });

  const updated = await MyGlobal.prisma.recipe_sharing_premiumusers.update({
    where: { id: props.id },
    data: {
      email: props.body.email === null ? null : (props.body.email ?? undefined),
      username:
        props.body.username === null
          ? null
          : (props.body.username ?? undefined),
      premium_since:
        props.body.premium_since === null
          ? null
          : (props.body.premium_since ?? undefined),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    email: updated.email,
    username: updated.username,
    premium_since: updated.premium_since ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
