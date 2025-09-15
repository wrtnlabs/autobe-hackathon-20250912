import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ExternallearnerPayload } from "../decorators/payload/ExternallearnerPayload";

/**
 * Soft delete a payment transaction by ID.
 *
 * This operation sets the deleted_at timestamp of the payment transaction
 * identified by ID for audit compliance and data preservation.
 *
 * Requires the user to be an authenticated externalLearner and owner of the
 * transaction.
 *
 * @param props - Object containing the authenticated externalLearner and
 *   payment transaction ID
 * @throws {Error} When the payment transaction is not found or user is not
 *   authorized
 */
export async function deleteenterpriseLmsExternalLearnerPaymentTransactionsId(props: {
  externalLearner: ExternallearnerPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { externalLearner, id } = props;

  const paymentTransaction =
    await MyGlobal.prisma.enterprise_lms_payment_transactions.findFirst({
      where: {
        id,
        user_id: externalLearner.id,
        deleted_at: null,
      },
    });

  if (!paymentTransaction) {
    throw new Error("Payment transaction not found or not authorized");
  }

  const deletedAt = toISOStringSafe(new Date());

  await MyGlobal.prisma.enterprise_lms_payment_transactions.update({
    where: { id },
    data: {
      deleted_at: deletedAt,
      updated_at: deletedAt,
    },
  });
}
