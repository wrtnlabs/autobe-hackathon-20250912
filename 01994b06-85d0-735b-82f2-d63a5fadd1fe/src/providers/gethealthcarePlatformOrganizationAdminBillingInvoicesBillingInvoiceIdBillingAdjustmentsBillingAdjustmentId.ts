import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformBillingAdjustment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingAdjustment";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Retrieve a single billing adjustment's detailed information for a specific
 * invoice.
 *
 * This operation fetches the full details and metadata for a single billing
 * adjustment that is associated with a specific invoice. Only organization
 * admins of the owning organization may view the adjustment. Access is strictly
 * RBAC controlled and all attempts are audit logged. Returned data includes
 * adjustment type, amount, timestamps, and references to affected items or
 * invoices. All date values are ISO 8601 strings, and nullable/optional fields
 * are handled per API structure.
 *
 * @param props - Request object containing required authorization and
 *   identifiers
 * @param props.organizationAdmin - Authenticated payload representing the
 *   organization admin performing this request
 * @param props.billingInvoiceId - The parent invoice id to which the adjustment
 *   must belong
 * @param props.billingAdjustmentId - The adjustment id to fetch
 * @returns The detailed billing adjustment record for this invoice
 * @throws {Error} Adjustment not found, invoice not found, or unauthorized
 *   access
 */
export async function gethealthcarePlatformOrganizationAdminBillingInvoicesBillingInvoiceIdBillingAdjustmentsBillingAdjustmentId(props: {
  organizationAdmin: OrganizationadminPayload;
  billingInvoiceId: string & tags.Format<"uuid">;
  billingAdjustmentId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformBillingAdjustment> {
  const { organizationAdmin, billingInvoiceId, billingAdjustmentId } = props;

  // 1. Fetch adjustment by ID and invoice, ensure not deleted
  const adjustment =
    await MyGlobal.prisma.healthcare_platform_billing_adjustments.findFirst({
      where: {
        id: billingAdjustmentId,
        invoice_id: billingInvoiceId,
        deleted_at: null,
      },
    });
  if (!adjustment) throw new Error("Adjustment not found");

  // 2. Fetch the invoice for RBAC
  const invoice =
    await MyGlobal.prisma.healthcare_platform_billing_invoices.findFirst({
      where: {
        id: billingInvoiceId,
      },
    });
  if (!invoice) throw new Error("Invoice not found");

  // 3. RBAC: Only admin for owning organization may view
  if (invoice.organization_id !== organizationAdmin.id) {
    throw new Error(
      "Unauthorized: Only admins for the invoice's organization may access this adjustment.",
    );
  }

  // 4. Map result fields strictly, handling nulls and converting timestamps
  return {
    id: adjustment.id,
    invoice_id:
      adjustment.invoice_id === null ? undefined : adjustment.invoice_id,
    item_id: adjustment.item_id === null ? undefined : adjustment.item_id,
    adjustment_type: adjustment.adjustment_type,
    description:
      adjustment.description === "" ? undefined : adjustment.description,
    amount: adjustment.amount,
    created_at: toISOStringSafe(adjustment.created_at),
  };
}
