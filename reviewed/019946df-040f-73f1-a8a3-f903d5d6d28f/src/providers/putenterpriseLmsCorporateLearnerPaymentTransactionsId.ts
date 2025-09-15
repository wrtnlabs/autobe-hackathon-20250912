import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsPaymentTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsPaymentTransaction";
import { CorporatelearnerPayload } from "../decorators/payload/CorporatelearnerPayload";

/**
 * Update an existing payment transaction by ID in the Enterprise LMS system.
 *
 * This function updates mutable fields such as amount, payment method, status,
 * and other optional details. Immutable fields like tenant_id and user_id
 * cannot be changed. It ensures that the corporate learner owns the payment
 * transaction before updating.
 *
 * @param props - The update request including the corporate learner,
 *   transaction id, and update data.
 * @returns The full updated payment transaction record.
 * @throws {Error} When the transaction does not exist or corporate learner is
 *   unauthorized.
 */
export async function putenterpriseLmsCorporateLearnerPaymentTransactionsId(props: {
  corporateLearner: CorporatelearnerPayload;
  id: string & tags.Format<"uuid">;
  body: IEnterpriseLmsPaymentTransaction.IUpdate;
}): Promise<IEnterpriseLmsPaymentTransaction> {
  const { corporateLearner, id, body } = props;

  const existing =
    await MyGlobal.prisma.enterprise_lms_payment_transactions.findFirst({
      where: {
        id,
        user_id: corporateLearner.id,
        deleted_at: null,
      },
    });

  if (!existing) {
    throw new Error("Transaction not found or unauthorized");
  }

  const updateData: IEnterpriseLmsPaymentTransaction.IUpdate = {};

  if (body.transaction_code !== undefined)
    updateData.transaction_code = body.transaction_code;
  if (body.amount !== undefined) updateData.amount = body.amount;
  if (body.currency !== undefined) updateData.currency = body.currency;
  if (body.payment_method !== undefined)
    updateData.payment_method = body.payment_method;
  if (body.status !== undefined) updateData.status = body.status;

  if (Object.prototype.hasOwnProperty.call(body, "gateway_reference")) {
    updateData.gateway_reference = body.gateway_reference ?? null;
  }

  if (body.created_at !== undefined) {
    updateData.created_at = body.created_at ?? null;
  }
  if (body.updated_at !== undefined && body.updated_at !== null) {
    updateData.updated_at = body.updated_at;
  }
  if (Object.prototype.hasOwnProperty.call(body, "deleted_at")) {
    updateData.deleted_at = body.deleted_at ?? null;
  }

  const updated =
    await MyGlobal.prisma.enterprise_lms_payment_transactions.update({
      where: { id },
      data: updateData,
    });

  return {
    id: updated.id,
    tenant_id: updated.tenant_id,
    user_id: updated.user_id,
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
