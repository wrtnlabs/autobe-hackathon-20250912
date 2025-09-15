import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformBillingInvoice } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingInvoice";
import { PatientPayload } from "../decorators/payload/PatientPayload";

/**
 * Retrieve a specific billing invoice by ID (IHealthcarePlatformBillingInvoice)
 *
 * Retrieves a billing invoice using its unique identifier. The invoice must
 * belong to the authenticated patient and must not be soft-deleted (deleted_at
 * is null). Enforces strict RBAC privacy boundaries—patients can access only
 * their own data. Throws an error if not found or not owned. All date/datetime
 * values are returned as strings in ISO 8601 format using typia tags. No use of
 * native Date or type assertions anywhere.
 *
 * @param props - Properties for the operation
 * @param props.patient - The authenticated PatientPayload
 * @param props.billingInvoiceId - UUID of the billing invoice to retrieve
 * @returns The matching billing invoice as IHealthcarePlatformBillingInvoice
 * @throws {Error} If the billing invoice is not found, has been deleted, or
 *   does not belong to the requesting patient
 */
export async function gethealthcarePlatformPatientBillingInvoicesBillingInvoiceId(props: {
  patient: PatientPayload;
  billingInvoiceId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformBillingInvoice> {
  const { patient, billingInvoiceId } = props;
  const invoice =
    await MyGlobal.prisma.healthcare_platform_billing_invoices.findFirst({
      where: {
        id: billingInvoiceId,
        deleted_at: null,
      },
      select: {
        id: true,
        organization_id: true,
        patient_id: true,
        encounter_id: true,
        invoice_number: true,
        description: true,
        status: true,
        total_amount: true,
        currency: true,
        due_date: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (!invoice || invoice.patient_id !== patient.id) {
    throw new Error("Invoice not found or access denied");
  }
  return {
    id: invoice.id,
    organization_id: invoice.organization_id,
    patient_id: invoice.patient_id,
    encounter_id:
      invoice.encounter_id === null ? undefined : invoice.encounter_id,
    invoice_number: invoice.invoice_number,
    description: invoice.description === null ? undefined : invoice.description,
    status: invoice.status,
    total_amount: invoice.total_amount,
    currency: invoice.currency,
    due_date:
      invoice.due_date === null ? undefined : toISOStringSafe(invoice.due_date),
    created_at: toISOStringSafe(invoice.created_at),
    updated_at: toISOStringSafe(invoice.updated_at),
    deleted_at:
      invoice.deleted_at === null
        ? undefined
        : toISOStringSafe(invoice.deleted_at),
  };
}
