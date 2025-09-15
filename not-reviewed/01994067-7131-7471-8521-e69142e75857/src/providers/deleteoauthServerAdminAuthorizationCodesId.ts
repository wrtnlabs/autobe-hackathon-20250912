import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Deletes the OAuth authorization code record identified by the given ID from
 * the database.
 *
 * This is a hard delete operation that permanently removes the record,
 * including all associated metadata. It is an administrative operation used to
 * clean up revoked or obsolete authorization codes.
 *
 * Security controls enforce that only administrators can perform this
 * operation.
 *
 * @param props - Object containing the admin user info and the ID of the
 *   authorization code to delete
 * @param props.admin - The authenticated admin user performing the deletion
 * @param props.id - The UUID of the authorization code record to be deleted
 * @returns Void
 * @throws {Error} If the authorization code does not exist or if the user is
 *   unauthorized
 */
export async function deleteoauthServerAdminAuthorizationCodesId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  await MyGlobal.prisma.oauth_server_authorization_codes.delete({
    where: { id: props.id },
  });
}
