import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformBillingAdjustment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingAdjustment";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Retrieve a single billing adjustment's detailed information for a specific
 * invoice.
 *
 * Fetches one billing adjustment entity directly associated with the given
 * billing invoice. Only accessible to authenticated system administrators. The
 * adjustment record includes all core metadata, including IDs, type, amount,
 * description, and creation timestamp, enabling audit, review, and compliance
 * workflows as required. Throws an error if no such adjustment is found for the
 * specified invoice.
 *
 * @param props - Arguments for billing adjustment retrieval operation
 * @param props.systemAdmin - Authenticated system administrator payload (must
 *   be present, checked by upstream layer)
 * @param props.billingInvoiceId - UUID of the parent billing invoice to which
 *   the adjustment is attached
 * @param props.billingAdjustmentId - UUID of the billing adjustment record to
 *   retrieve
 * @returns An IHealthcarePlatformBillingAdjustment containing full details of
 *   the specified adjustment
 * @throws {Error} If adjustment with the specified billingAdjustmentId for
 *   billingInvoiceId is not found
 */
export async function gethealthcarePlatformSystemAdminBillingInvoicesBillingInvoiceIdBillingAdjustmentsBillingAdjustmentId(props: {
  systemAdmin: SystemadminPayload;
  billingInvoiceId: string & tags.Format<"uuid">;
  billingAdjustmentId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformBillingAdjustment> {
  const { billingInvoiceId, billingAdjustmentId } = props;

  const adjustment =
    await MyGlobal.prisma.healthcare_platform_billing_adjustments.findFirst({
      where: {
        id: billingAdjustmentId,
        invoice_id: billingInvoiceId,
      },
      select: {
        id: true,
        invoice_id: true,
        item_id: true,
        adjustment_type: true,
        description: true,
        amount: true,
        created_at: true,
      },
    });

  if (!adjustment) {
    throw new Error("Billing adjustment not found");
  }

  return {
    id: adjustment.id,
    invoice_id:
      adjustment.invoice_id === null ? undefined : adjustment.invoice_id,
    item_id: adjustment.item_id === null ? undefined : adjustment.item_id,
    adjustment_type: adjustment.adjustment_type,
    description:
      adjustment.description === null ? undefined : adjustment.description,
    amount: adjustment.amount,
    created_at: toISOStringSafe(adjustment.created_at),
  };
}
