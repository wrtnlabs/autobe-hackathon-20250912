import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsPaymentTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsPaymentTransaction";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Retrieves detailed information about a specific payment transaction by its
 * unique ID.
 *
 * This operation enforces tenant data isolation by confirming that the
 * requesting system administrator belongs to the tenant owning the payment
 * transaction.
 *
 * @param props - The function parameters.
 * @param props.systemAdmin - The authenticated system administrator payload.
 * @param props.id - The unique UUID of the payment transaction to retrieve.
 * @returns The full details of the payment transaction matching the given ID.
 * @throws {Error} When the payment transaction does not belong to the
 *   authenticated tenant.
 * @throws {Error} When the payment transaction with the given ID is not found.
 */
export async function getenterpriseLmsSystemAdminPaymentTransactionsId(props: {
  systemAdmin: SystemadminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IEnterpriseLmsPaymentTransaction> {
  const { systemAdmin, id } = props;

  const record =
    await MyGlobal.prisma.enterprise_lms_payment_transactions.findUniqueOrThrow(
      {
        where: { id },
      },
    );

  if (record.tenant_id !== systemAdmin.id) {
    throw new Error("Unauthorized: Tenant mismatch");
  }

  return {
    id: record.id,
    tenant_id: record.tenant_id,
    user_id: record.user_id,
    transaction_code: record.transaction_code,
    amount: record.amount,
    currency: record.currency,
    payment_method: record.payment_method,
    status: record.status,
    gateway_reference:
      record.gateway_reference === null ? null : record.gateway_reference,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at:
      record.deleted_at === null ? null : toISOStringSafe(record.deleted_at),
  };
}
