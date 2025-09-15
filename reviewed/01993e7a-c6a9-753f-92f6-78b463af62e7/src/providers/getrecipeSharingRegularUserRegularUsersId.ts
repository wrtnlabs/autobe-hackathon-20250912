import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Retrieve detailed information of a regular user identified by their unique
 * ID.
 *
 * This endpoint returns public user information excluding sensitive fields like
 * password hashes. Access is restricted to authenticated regular users.
 *
 * @param props - Object containing the authenticated regularUser and the target
 *   user ID
 * @param props.regularUser - Authenticated regular user payload for
 *   authorization
 * @param props.id - UUID of the target regular user to retrieve
 * @returns The user information as IRecipeSharingRegularUser excluding password
 *   hash
 * @throws {Error} Throws if user with specified ID does not exist
 */
export async function getrecipeSharingRegularUserRegularUsersId(props: {
  regularUser: RegularuserPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IRecipeSharingRegularUser> {
  const { regularUser, id } = props;

  const user =
    await MyGlobal.prisma.recipe_sharing_regularusers.findUniqueOrThrow({
      where: { id },
      select: {
        id: true,
        email: true,
        username: true,
        password_hash: false, // exclude sensitive info
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });

  return {
    id: user.id,
    email: user.email,
    username: user.username,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at: user.deleted_at ? toISOStringSafe(user.deleted_at) : undefined,
  };
}
