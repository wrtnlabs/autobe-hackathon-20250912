import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { GuestPayload } from "../decorators/payload/GuestPayload";

/**
 * Erase (delete) a specific oauthServerGuest entity by unique ID.
 *
 * This operation performs a hard delete of the guest user record from the
 * database, permanently removing all guest user data and audit history. Soft
 * delete timestamp is supported in the schema but this endpoint enforces full
 * deletion.
 *
 * Authorization requires the 'guest' role verified via the guest payload.
 *
 * @param props - Object containing authenticated guest and the ID of the guest
 *   to delete
 * @param props.guest - Authenticated guest payload
 * @param props.id - UUID string of the guest entity to delete
 * @throws {Error} When the guest user does not exist or is already deleted
 */
export async function deleteoauthServerGuestOauthServerGuestsId(props: {
  guest: GuestPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { guest, id } = props;

  const existingGuest = await MyGlobal.prisma.oauth_server_guests.findUnique({
    where: { id },
  });

  if (!existingGuest || existingGuest.deleted_at !== null) {
    throw new Error("Guest user not found or already deleted");
  }

  await MyGlobal.prisma.oauth_server_guests.delete({
    where: { id },
  });
}
