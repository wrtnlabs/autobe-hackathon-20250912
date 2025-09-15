import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { CorporatelearnerPayload } from "../decorators/payload/CorporatelearnerPayload";

/**
 * Soft delete a payment transaction by ID
 *
 * This operation sets the deleted_at timestamp of the specified payment
 * transaction record belonging to the authenticated corporate learner,
 * effectively marking it as deleted without physically removing the record.
 * Authorization ensures the transaction belongs to the requester.
 *
 * @param props - Object containing corporateLearner payload and payment
 *   transaction ID
 * @param props.corporateLearner - Authenticated corporate learner information
 * @param props.id - UUID of the payment transaction to delete
 * @throws {Error} When the transaction does not exist or is not owned by the
 *   user
 */
export async function deleteenterpriseLmsCorporateLearnerPaymentTransactionsId(props: {
  corporateLearner: CorporatelearnerPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { corporateLearner, id } = props;

  const paymentTransaction =
    await MyGlobal.prisma.enterprise_lms_payment_transactions.findFirst({
      where: {
        id,
        user_id: corporateLearner.id,
        deleted_at: null,
      },
    });

  if (!paymentTransaction) {
    throw new Error("Payment transaction not found or access denied");
  }

  const now = toISOStringSafe(new Date());

  await MyGlobal.prisma.enterprise_lms_payment_transactions.update({
    where: { id },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
}
