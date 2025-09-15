import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsPaymentTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsPaymentTransaction";
import { GuestPayload } from "../decorators/payload/GuestPayload";

/**
 * Update an existing payment transaction by ID.
 *
 * This function updates mutable fields of the payment transaction while
 * ensuring that the authenticated guest user owns the transaction. Immutable
 * fields such as tenant_id and user_id cannot be altered.
 *
 * @param props - Object containing guest payload, transaction ID, and update
 *   body
 * @param props.guest - Authenticated guest user performing the update
 * @param props.id - UUID of the payment transaction to update
 * @param props.body - Update data conforming to
 *   IEnterpriseLmsPaymentTransaction.IUpdate
 * @returns Promise resolving to the updated payment transaction record
 * @throws {Error} When the transaction is not found or the user is unauthorized
 */
export async function putenterpriseLmsGuestPaymentTransactionsId(props: {
  guest: GuestPayload;
  id: string & tags.Format<"uuid">;
  body: IEnterpriseLmsPaymentTransaction.IUpdate;
}): Promise<IEnterpriseLmsPaymentTransaction> {
  const { guest, id, body } = props;

  // Authorization check: Confirm the payment transaction belongs to the guest
  const existing =
    await MyGlobal.prisma.enterprise_lms_payment_transactions.findUnique({
      where: { id },
      select: { id: true, user_id: true, tenant_id: true },
    });

  if (!existing) throw new Error("Payment transaction not found.");
  if (existing.user_id !== guest.id)
    throw new Error(
      "Unauthorized: You can only update your own payment transactions.",
    );

  // Prepare update payload with allowed mutable fields
  const updated_at = body.updated_at ?? toISOStringSafe(new Date());

  const updateData: IEnterpriseLmsPaymentTransaction.IUpdate = {
    transaction_code: body.transaction_code ?? undefined,
    amount: body.amount ?? undefined,
    currency: body.currency ?? undefined,
    payment_method: body.payment_method ?? undefined,
    status: body.status ?? undefined,
    gateway_reference: body.gateway_reference ?? undefined,
    created_at: body.created_at ?? null,
    updated_at: updated_at,
    deleted_at: body.deleted_at ?? undefined,
  };

  // Perform update
  const updated =
    await MyGlobal.prisma.enterprise_lms_payment_transactions.update({
      where: { id },
      data: updateData,
    });

  // Return updated record with proper date formatting
  return {
    id: updated.id as string & tags.Format<"uuid">,
    tenant_id: updated.tenant_id as string & tags.Format<"uuid">,
    user_id: updated.user_id as string & tags.Format<"uuid">,
    transaction_code: updated.transaction_code,
    amount: updated.amount,
    currency: updated.currency,
    payment_method: updated.payment_method,
    status: updated.status,
    gateway_reference: updated.gateway_reference ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
