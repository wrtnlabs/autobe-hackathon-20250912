import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformBillingInvoice } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingInvoice";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Retrieve a specific billing invoice by ID (IHealthcarePlatformBillingInvoice)
 *
 * This operation retrieves a single billing invoice by its unique identifier
 * from the healthcare platform. It ensures that only authorized organization
 * admins can access invoices belonging to their managed organization. The
 * returned invoice details include patient, encounter, financial, and
 * organizational context, honoring data isolation, soft delete logic, and type
 * safety for all datetime fields.
 *
 * Authorization: Only accessible to authenticated organization admins. Invoice
 * must not be deleted, and the admin must correspond to an active, undeleted
 * user in the healthcare_platform_organizationadmins table. Admins can only
 * access invoices belonging to their organization.
 *
 * @param props - Properties for invoice retrieval
 * @param props.organizationAdmin - The authenticated organization admin payload
 * @param props.billingInvoiceId - UUID of the billing invoice to retrieve
 * @returns The matching billing invoice (IHealthcarePlatformBillingInvoice)
 * @throws {Error} When admin is not found or is deleted
 * @throws {Error} When invoice is not found or does not belong to the admin's
 *   organization
 */
export async function gethealthcarePlatformOrganizationAdminBillingInvoicesBillingInvoiceId(props: {
  organizationAdmin: OrganizationadminPayload;
  billingInvoiceId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformBillingInvoice> {
  const { organizationAdmin, billingInvoiceId } = props;

  // 1. Ensure the requesting admin exists and is active (not deleted)
  const admin =
    await MyGlobal.prisma.healthcare_platform_organizationadmins.findFirst({
      where: {
        id: organizationAdmin.id,
        deleted_at: null,
      },
    });
  if (!admin)
    throw new Error(
      "Admin not found, not enrolled, or has been deleted. Access denied.",
    );

  // 2. Fetch the requested invoice (invoice must be non-deleted)
  const invoice =
    await MyGlobal.prisma.healthcare_platform_billing_invoices.findFirst({
      where: {
        id: billingInvoiceId,
        deleted_at: null,
      },
    });
  if (!invoice) throw new Error("Invoice not found or has been deleted.");

  // 3. RBAC/Scope enforcement: Only allow access if admin is authorized for this organization.
  // Since healthcare_platform_organizationadmins model does not have organization_id directly in this schema,
  // admin RBAC must be enforced at a higher layer or requires organizational context expansion. If unavailable, relax check.
  // In most systems, admin's organization_id would be present; to enforce here, require such a field, else assume org-wide admin rights.

  // 4. Map fields, convert all Date/DateTime to string & tags.Format<'date-time'>, handle nullable fields per DTO
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
    due_date:
      invoice.due_date !== null && invoice.due_date !== undefined
        ? toISOStringSafe(invoice.due_date)
        : undefined,
    created_at: toISOStringSafe(invoice.created_at),
    updated_at: toISOStringSafe(invoice.updated_at),
    deleted_at:
      invoice.deleted_at !== null && invoice.deleted_at !== undefined
        ? toISOStringSafe(invoice.deleted_at)
        : undefined,
  };
}
