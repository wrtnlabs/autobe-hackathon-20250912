import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformBillingInvoice } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingInvoice";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Retrieve a specific billing invoice by ID (IHealthcarePlatformBillingInvoice)
 *
 * Retrieves a healthcare platform billing invoice using its unique UUID
 * identifier. This operation enforces system admin RBAC, returns only
 * non-deleted invoices, and maps all date/datetime fields to ISO 8601 string
 * format as required by the API specification.
 *
 * @param props - Request properties
 * @param props.systemAdmin - The authenticated system administrator making the
 *   request
 * @param props.billingInvoiceId - UUID of the billing invoice to retrieve
 * @returns The full IHealthcarePlatformBillingInvoice object
 * @throws {Error} If the invoice does not exist, is deleted, or RBAC is
 *   violated
 */
export async function gethealthcarePlatformSystemAdminBillingInvoicesBillingInvoiceId(props: {
  systemAdmin: SystemadminPayload;
  billingInvoiceId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformBillingInvoice> {
  const { billingInvoiceId } = props;
  const invoice =
    await MyGlobal.prisma.healthcare_platform_billing_invoices.findFirst({
      where: {
        id: billingInvoiceId,
        deleted_at: null,
      },
    });
  if (!invoice) {
    throw new Error("Billing invoice not found");
  }
  return {
    id: invoice.id,
    organization_id: invoice.organization_id,
    patient_id: invoice.patient_id,
    encounter_id: invoice.encounter_id ?? undefined,
    invoice_number: invoice.invoice_number,
    description: invoice.description ?? undefined,
    status: invoice.status,
    total_amount: invoice.total_amount,
    currency: invoice.currency,
    due_date: invoice.due_date ? toISOStringSafe(invoice.due_date) : undefined,
    created_at: toISOStringSafe(invoice.created_at),
    updated_at: toISOStringSafe(invoice.updated_at),
    deleted_at: invoice.deleted_at
      ? toISOStringSafe(invoice.deleted_at)
      : undefined,
  };
}
