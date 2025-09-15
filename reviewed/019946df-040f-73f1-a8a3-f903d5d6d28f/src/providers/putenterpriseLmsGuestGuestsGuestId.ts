import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsGuest";
import { GuestPayload } from "../decorators/payload/GuestPayload";

/**
 * Update guest user by ID.
 *
 * Update an existing guest user identified by guestId with the provided data.
 * Changes to email, name, password_hash, status, and soft deletion timestamp
 * are permitted. Tenant data isolation is enforced by verifying ownership
 * through the guest payload.
 *
 * @param props - Object containing the authenticated guest payload, guestId
 *   path parameter, and update body.
 * @param props.guest - The authenticated guest making the request.
 * @param props.guestId - UUID of the guest user to update.
 * @param props.body - Guest user update data.
 * @returns The updated guest user details.
 * @throws {Error} When the guest to update does not exist.
 * @throws {Error} When the authenticated guest does not own the guest record.
 */
export async function putenterpriseLmsGuestGuestsGuestId(props: {
  guest: GuestPayload;
  guestId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsGuest.IUpdate;
}): Promise<IEnterpriseLmsGuest> {
  const { guest, guestId, body } = props;

  const originalGuest =
    await MyGlobal.prisma.enterprise_lms_guest.findUniqueOrThrow({
      where: { id: guestId },
    });

  if (originalGuest.id !== guest.id) {
    throw new Error("Unauthorized: Can only update own guest record.");
  }

  const updated = await MyGlobal.prisma.enterprise_lms_guest.update({
    where: { id: guestId },
    data: {
      email: body.email ?? undefined,
      password_hash: body.password_hash ?? undefined,
      first_name: body.first_name ?? undefined,
      last_name: body.last_name ?? undefined,
      status: body.status ?? undefined,
      deleted_at: body.deleted_at ?? undefined,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    tenant_id: updated.tenant_id,
    email: updated.email,
    password_hash: updated.password_hash,
    first_name: updated.first_name,
    last_name: updated.last_name,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ?? null,
  };
}
