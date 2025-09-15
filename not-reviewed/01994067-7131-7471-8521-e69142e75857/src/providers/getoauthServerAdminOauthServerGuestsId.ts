import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerguests } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerguests";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve guest account details by ID
 *
 * This operation fetches detailed information about a guest user account
 * identified by a UUID. It returns creation, update, and soft deletion
 * timestamps for audit purposes. Access is restricted to authenticated admin
 * users.
 *
 * @param props - Object containing the authenticated admin and guest ID
 * @param props.admin - The authenticated admin payload
 * @param props.id - UUID of the guest user to retrieve
 * @returns The guest user entity corresponding to the specified ID
 * @throws {Error} If no guest user with the given ID is found
 */
export async function getoauthServerAdminOauthServerGuestsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IOauthServerguests> {
  const { id } = props;

  // Fetch guest user record by unique ID, or throw if not found
  const guest = await MyGlobal.prisma.oauth_server_guests.findUniqueOrThrow({
    where: { id },
  });

  // Return the guest user entity with all date fields converted to ISO strings
  return {
    id: guest.id,
    created_at: toISOStringSafe(guest.created_at),
    updated_at: toISOStringSafe(guest.updated_at),
    deleted_at: guest.deleted_at ? toISOStringSafe(guest.deleted_at) : null,
  };
}
