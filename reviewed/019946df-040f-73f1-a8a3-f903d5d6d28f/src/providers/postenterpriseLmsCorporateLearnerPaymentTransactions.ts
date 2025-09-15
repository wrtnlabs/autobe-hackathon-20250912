import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsPaymentTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsPaymentTransaction";
import { CorporatelearnerPayload } from "../decorators/payload/CorporatelearnerPayload";

/**
 * Creates a new payment transaction record linked to a tenant and user within
 * the Enterprise LMS system.
 *
 * This function accepts a validated request body matching the
 * IEnterpriseLmsPaymentTransaction.ICreate interface, generates a new unique
 * UUID for the transaction record, and inserts it into the database. It
 * properly handles nullable optional fields and returns the fully created
 * payment transaction.
 *
 * @param props - An object containing the authenticated corporate learner and
 *   the payment transaction creation payload.
 * @param props.corporateLearner - The authenticated corporate learner's
 *   payload.
 * @param props.body - The payment transaction creation details.
 * @returns The fully created payment transaction record.
 * @throws Will throw an error if the database operation fails.
 */
export async function postenterpriseLmsCorporateLearnerPaymentTransactions(props: {
  corporateLearner: CorporatelearnerPayload;
  body: IEnterpriseLmsPaymentTransaction.ICreate;
}): Promise<IEnterpriseLmsPaymentTransaction> {
  const created =
    await MyGlobal.prisma.enterprise_lms_payment_transactions.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        tenant_id: props.body.tenant_id,
        user_id: props.body.user_id,
        transaction_code: props.body.transaction_code,
        amount: props.body.amount,
        currency: props.body.currency,
        payment_method: props.body.payment_method,
        status: props.body.status,
        gateway_reference: props.body.gateway_reference ?? null,
        created_at: props.body.created_at,
        updated_at: props.body.updated_at,
        deleted_at: props.body.deleted_at ?? null,
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
    created_at: created.created_at,
    updated_at: created.updated_at,
    deleted_at: created.deleted_at ?? null,
  };
}
