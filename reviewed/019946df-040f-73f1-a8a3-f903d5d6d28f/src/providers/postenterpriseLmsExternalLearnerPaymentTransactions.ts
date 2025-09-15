import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsPaymentTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsPaymentTransaction";
import { ExternallearnerPayload } from "../decorators/payload/ExternallearnerPayload";

/**
 * Creates a new payment transaction record linked to a tenant and user within
 * the Enterprise LMS system.
 *
 * This operation validates that the caller (externalLearner) is authorized to
 * create the transaction for the specified tenant and user IDs. It performs
 * business validations on the payment amount, currency, and status. The
 * transaction is then created with a new UUID and timestamps.
 *
 * @param props - Object containing the authenticated external learner and the
 *   transaction create body
 * @param props.externalLearner - Authenticated external learner performing the
 *   operation
 * @param props.body - Payment transaction creation data
 * @returns The newly created payment transaction record with all fields
 * @throws {Error} If authorization fails or validation errors occur
 */
export async function postenterpriseLmsExternalLearnerPaymentTransactions(props: {
  externalLearner: ExternallearnerPayload;
  body: IEnterpriseLmsPaymentTransaction.ICreate;
}): Promise<IEnterpriseLmsPaymentTransaction> {
  const { externalLearner, body } = props;

  if (externalLearner.tenant_id !== body.tenant_id)
    throw new Error("Unauthorized: tenant_id mismatch");
  if (externalLearner.id !== body.user_id)
    throw new Error("Unauthorized: user_id mismatch");

  if (body.amount <= 0) throw new Error("Invalid amount: must be positive");
  if (!body.currency) throw new Error("Currency must be non-empty");
  if (!body.status) throw new Error("Status must be non-empty");

  const createdAt = toISOStringSafe(body.created_at);
  const updatedAt = toISOStringSafe(body.updated_at);

  const created =
    await MyGlobal.prisma.enterprise_lms_payment_transactions.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
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
    id: created.id,
    tenant_id: created.tenant_id,
    user_id: created.user_id,
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
