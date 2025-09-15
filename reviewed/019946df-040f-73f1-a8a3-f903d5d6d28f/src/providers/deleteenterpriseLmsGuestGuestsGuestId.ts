import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { GuestPayload } from "../decorators/payload/GuestPayload";

/**
 * Soft delete guest user by ID
 *
 * This operation marks the guest user identified by guestId as deleted by
 * setting the deleted_at timestamp. Authorization requires the authenticated
 * guest to only delete their own account.
 *
 * @param props - Object containing the authenticated guest payload and the
 *   guestId to delete
 * @param props.guest - The authenticated guest user making the request
 * @param props.guestId - The UUID of the guest user to soft delete
 * @throws {Error} If the user attempts to delete another guest's account
 * @throws {Error} If the guest user does not exist or is already deleted
 */
export async function deleteenterpriseLmsGuestGuestsGuestId(props: {
  guest: GuestPayload;
  guestId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { guest, guestId } = props;

  if (guest.id !== guestId) {
    throw new Error("Unauthorized: Cannot delete other guest user accounts");
  }

  const foundGuest = await MyGlobal.prisma.enterprise_lms_guest.findFirst({
    where: {
      id: guestId,
      deleted_at: null,
    },
  });

  if (!foundGuest) {
    throw new Error("Guest not found or already deleted");
  }

  await MyGlobal.prisma.enterprise_lms_guest.update({
    where: { id: guestId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
}
