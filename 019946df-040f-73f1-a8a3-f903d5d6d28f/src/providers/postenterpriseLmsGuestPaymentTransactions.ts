import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsPaymentTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsPaymentTransaction";
import { GuestPayload } from "../decorators/payload/GuestPayload";

/**
 * Creates a new payment transaction record linked to a tenant and user within
 * the Enterprise LMS system.
 *
 * Validates the transaction amount to be positive. Generates a UUID for the id.
 * Converts all date/time fields using toISOStringSafe.
 *
 * Throws an error if the amount is not positive.
 *
 * @param props - Object containing the guest user and the payment transaction
 *   data
 * @param props.guest - The authenticated guest context
 * @param props.body - The payment transaction creation data
 * @returns The newly created payment transaction record
 * @throws {Error} When amount is zero or negative
 */
export async function postenterpriseLmsGuestPaymentTransactions(props: {
  guest: GuestPayload;
  body: IEnterpriseLmsPaymentTransaction.ICreate;
}): Promise<IEnterpriseLmsPaymentTransaction> {
  const { guest, body } = props;

  if (body.amount <= 0) {
    throw new Error("Amount must be positive");
  }

  const id = v4();
  const createdAt = toISOStringSafe(body.created_at);
  const updatedAt = toISOStringSafe(body.updated_at);

  const created =
    await MyGlobal.prisma.enterprise_lms_payment_transactions.create({
      data: {
        id,
        tenant_id: body.tenant_id,
        user_id: body.user_id,
        transaction_code: body.transaction_code,
        amount: body.amount,
        currency: body.currency,
        payment_method: body.payment_method,
        status: body.status,
        gateway_reference: body.gateway_reference ?? null,
        created_at: createdAt,
        updated_at: updatedAt,
        deleted_at: body.deleted_at ?? null,
      },
    });

  return {
    id: created.id as string & tags.Format<"uuid">,
    tenant_id: created.tenant_id as string & tags.Format<"uuid">,
    user_id: created.user_id as string & tags.Format<"uuid">,
    transaction_code: created.transaction_code,
    amount: created.amount,
    currency: created.currency,
    payment_method: created.payment_method,
    status: created.status,
    gateway_reference: created.gateway_reference ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
