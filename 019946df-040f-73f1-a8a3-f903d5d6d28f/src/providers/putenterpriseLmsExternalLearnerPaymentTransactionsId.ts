import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsPaymentTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsPaymentTransaction";
import { ExternallearnerPayload } from "../decorators/payload/ExternallearnerPayload";

/**
 * Updates a payment transaction identified by ID for an external learner.
 *
 * This function ensures that only the owner of the payment transaction (the
 * external learner) can update mutable fields in the transaction. Immutable
 * fields such as tenant_id, user_id, and transaction_code cannot be changed.
 *
 * All date fields are handled as ISO 8601 strings with proper branding.
 *
 * @param props - Properties object containing:
 *
 *   - ExternalLearner: Authenticated external learner payload
 *   - Id: UUID of the payment transaction to update
 *   - Body: Partial update data conforming to
 *       IEnterpriseLmsPaymentTransaction.IUpdate
 *
 * @returns The updated payment transaction record
 * @throws {Error} When the payment transaction does not exist or if
 *   unauthorized
 */
export async function putenterpriseLmsExternalLearnerPaymentTransactionsId(props: {
  externalLearner: ExternallearnerPayload;
  id: string & tags.Format<"uuid">;
  body: IEnterpriseLmsPaymentTransaction.IUpdate;
}): Promise<IEnterpriseLmsPaymentTransaction> {
  const { externalLearner, id, body } = props;

  const found =
    await MyGlobal.prisma.enterprise_lms_payment_transactions.findUnique({
      where: { id },
      select: {
        id: true,
        user_id: true,
        tenant_id: true,
        transaction_code: true,
        amount: true,
        currency: true,
        payment_method: true,
        status: true,
        gateway_reference: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });

  if (!found) {
    throw new Error(`Payment transaction not found: ${id}`);
  }

  if (found.user_id !== externalLearner.id) {
    throw new Error("Unauthorized: You can only update your own transactions");
  }

  const now = toISOStringSafe(new Date());

  const updated =
    await MyGlobal.prisma.enterprise_lms_payment_transactions.update({
      where: { id },
      data: {
        amount: body.amount ?? undefined,
        currency: body.currency ?? undefined,
        payment_method: body.payment_method ?? undefined,
        status: body.status ?? undefined,
        gateway_reference:
          body.gateway_reference === null
            ? null
            : (body.gateway_reference ?? undefined),
        created_at:
          body.created_at === null ? null : (body.created_at ?? undefined),
        updated_at: body.updated_at ?? now,
        deleted_at:
          body.deleted_at === null ? null : (body.deleted_at ?? undefined),
      },
    });

  return {
    id: updated.id,
    tenant_id: found.tenant_id,
    user_id: found.user_id,
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
