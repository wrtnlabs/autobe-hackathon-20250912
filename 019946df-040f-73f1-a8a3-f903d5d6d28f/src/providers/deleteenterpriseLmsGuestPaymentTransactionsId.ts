import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { GuestPayload } from "../decorators/payload/GuestPayload";

/**
 * Soft delete a payment transaction by ID.
 *
 * This operation sets the `deleted_at` timestamp on the payment transaction
 * identified by the given UUID, performing a soft delete instead of a hard
 * delete to preserve audit history.
 *
 * Authorization:
 *
 * - Only the guest user who owns the payment transaction can perform this
 *   operation.
 *
 * @param props - Object containing the authenticated guest and the payment
 *   transaction ID
 * @param props.guest - The authenticated guest user performing the deletion
 * @param props.id - The UUID of the payment transaction to soft delete
 * @throws {Error} Throws if the transaction does not belong to the guest user
 * @throws {Error} Throws if the payment transaction cannot be found
 */
export async function deleteenterpriseLmsGuestPaymentTransactionsId(props: {
  guest: GuestPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { guest, id } = props;

  // Find the payment transaction or throw if not found
  const transaction =
    await MyGlobal.prisma.enterprise_lms_payment_transactions.findUniqueOrThrow(
      {
        where: { id },
      },
    );

  // Authorization check: must belong to the guest
  if (transaction.user_id !== guest.id) {
    throw new Error("Unauthorized to delete this payment transaction");
  }

  // Soft delete by setting deleted_at timestamp
  await MyGlobal.prisma.enterprise_lms_payment_transactions.update({
    where: { id },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
}
