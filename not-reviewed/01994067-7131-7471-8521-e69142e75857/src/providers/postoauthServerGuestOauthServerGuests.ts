import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerGuest";
import { GuestPayload } from "../decorators/payload/GuestPayload";

/**
 * Create new oauthServerGuest entity
 *
 * This function creates a new guest user entity in the OAuth server system. It
 * generates a unique UUID for the guest user ID and timestamps for creation and
 * update. Soft delete is supported via the nullable deleted_at field.
 *
 * No input properties are necessary for creation as the guest entity is
 * minimal.
 *
 * @param props - The creation props containing the guest payload and creation
 *   body
 * @param props.guest - The guest user payload (authenticated guest user)
 * @param props.body - The creation request body, empty as per
 *   IOauthServerGuest.ICreate
 * @returns The newly created guest user entity conforming to IOauthServerGuest
 * @throws {Error} If database operation fails
 */
export async function postoauthServerGuestOauthServerGuests(props: {
  guest: GuestPayload;
  body: IOauthServerGuest.ICreate;
}): Promise<IOauthServerGuest> {
  const now = toISOStringSafe(new Date());
  const id = v4() as string & tags.Format<"uuid">;

  const created = await MyGlobal.prisma.oauth_server_guests.create({
    data: {
      id,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id,
    created_at: now,
    updated_at: now,
    deleted_at: created.deleted_at ?? null,
  };
}
