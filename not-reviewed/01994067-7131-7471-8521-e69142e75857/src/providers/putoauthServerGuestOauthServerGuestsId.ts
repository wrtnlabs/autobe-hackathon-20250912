import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerGuest";
import { GuestPayload } from "../decorators/payload/GuestPayload";

/**
 * Updates an existing oauthServerGuest entity identified by its unique ID.
 *
 * This operation allows modification of audit timestamp fields and soft delete
 * status. The guest role is authorized to perform this operation.
 *
 * @param props - Object containing guest payload, the ID to update, and update
 *   fields.
 * @param props.guest - Authenticated guest user payload.
 * @param props.id - UUID of the oauthServerGuest to update.
 * @param props.body - Update information conforming to
 *   IOauthServerGuest.IUpdate.
 * @returns The updated IOauthServerGuest entity with updated timestamps and
 *   soft delete status.
 * @throws {Error} Throws if the target guest entity does not exist.
 */
export async function putoauthServerGuestOauthServerGuestsId(props: {
  guest: GuestPayload;
  id: string & tags.Format<"uuid">;
  body: IOauthServerGuest.IUpdate;
}): Promise<IOauthServerGuest> {
  const { guest, id, body } = props;

  // Verify that the guest entity exists
  await MyGlobal.prisma.oauth_server_guests.findUniqueOrThrow({
    where: { id },
  });

  // Perform the update operation with provided fields
  const updated = await MyGlobal.prisma.oauth_server_guests.update({
    where: { id },
    data: {
      created_at: body.created_at === undefined ? undefined : body.created_at,
      updated_at: body.updated_at === undefined ? undefined : body.updated_at,
      deleted_at: body.deleted_at === undefined ? undefined : body.deleted_at,
    },
  });

  // Return the updated entity
  return {
    id: updated.id,
    created_at: updated.created_at,
    updated_at: updated.updated_at,
    deleted_at:
      updated.deleted_at === null ? null : updated.deleted_at || undefined,
  };
}
