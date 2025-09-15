import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformBillingAdjustment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingAdjustment";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Update an existing billing adjustment for a specific invoice
 * (healthcare_platform_billing_adjustments).
 *
 * Updates an existing billing adjustment for a specific billing invoice in the
 * healthcarePlatform system. This endpoint allows authorized organization
 * administrators to revise fields such as amount, adjustment type, or
 * description for an adjustment tied to a given invoice, as long as the
 * adjustment is not soft-deleted. Only mutable fields are updated; all changes
 * are tracked via audit log and soft-deleted/archived adjustments cannot be
 * edited.
 *
 * Authorization: Only users with organizationAdmin privileges may update
 * adjustments for their own organization's invoices.
 *
 * @param props - Object properties for this API call
 * @param props.organizationAdmin - Authenticated admin payload (must match org
 *   billing assignment, validated by middleware)
 * @param props.billingInvoiceId - The unique id of the invoice to which this
 *   adjustment belongs
 * @param props.billingAdjustmentId - The unique id for the target adjustment
 * @param props.body - Fields to update (amount, adjustment_type, description)
 * @returns The updated billing adjustment in DTO format (all ids as uuid, dates
 *   as ISO strings)
 * @throws {Error} 404 if the adjustment is not found, or validation fails
 */
export async function puthealthcarePlatformOrganizationAdminBillingInvoicesBillingInvoiceIdBillingAdjustmentsBillingAdjustmentId(props: {
  organizationAdmin: OrganizationadminPayload;
  billingInvoiceId: string & tags.Format<"uuid">;
  billingAdjustmentId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformBillingAdjustment.IUpdate;
}): Promise<IHealthcarePlatformBillingAdjustment> {
  const { billingInvoiceId, billingAdjustmentId, body } = props;

  // 1. Ensure target adjustment exists and is not archived/deleted.
  const adjustment =
    await MyGlobal.prisma.healthcare_platform_billing_adjustments.findFirst({
      where: {
        id: billingAdjustmentId,
        invoice_id: billingInvoiceId,
        deleted_at: null,
      },
    });
  if (!adjustment) {
    throw new Error("Billing adjustment not found");
  }

  // 2. Only update allowed fields: description, amount, adjustment_type; never mutable fields
  const updated =
    await MyGlobal.prisma.healthcare_platform_billing_adjustments.update({
      where: { id: billingAdjustmentId },
      data: {
        description: body.description ?? undefined,
        amount: body.amount ?? undefined,
        adjustment_type: body.adjustment_type ?? undefined,
        updated_at: toISOStringSafe(new Date()),
      },
    });

  // 3. Map DB row to API DTO format, enforcing correct null/undefined conventions
  return {
    id: updated.id,
    invoice_id: updated.invoice_id ?? undefined,
    item_id: updated.item_id ?? undefined,
    adjustment_type: updated.adjustment_type,
    description: updated.description ?? undefined,
    amount: updated.amount,
    created_at: toISOStringSafe(updated.created_at),
  };
}
