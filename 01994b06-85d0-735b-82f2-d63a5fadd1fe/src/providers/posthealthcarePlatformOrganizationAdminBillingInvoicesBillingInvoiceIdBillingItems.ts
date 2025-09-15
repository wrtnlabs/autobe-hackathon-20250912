import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformBillingItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingItem";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Create a billing item for an invoice (IHealthcarePlatformBillingItem)
 *
 * This operation enables authorized organization-level administrators to create
 * a new billing item under a specific billing invoice. It ensures the parent
 * invoice belongs to the admin's organization, is not deleted, and is in an
 * appropriate status. The specified billing code must exist, be active, and not
 * already be present for the invoice. The logic ensures all audit fields, value
 * calculations, and uniqueness/business validations are strictly enforced
 * according to schema and business rules. No native Date types or type
 * assertions are used—date values are formatted with toISOStringSafe and ids
 * are generated with v4().
 *
 * @param props - Parameters for the billing item creation
 * @param props.organizationAdmin - The authenticated organization admin
 *   performing the operation
 * @param props.billingInvoiceId - The UUID of the invoice to which the billing
 *   item will be added
 * @param props.body - Request body containing billing_code_id, description,
 *   quantity, and unit_price
 * @returns The created billing item record for the invoice
 * @throws {Error} If the invoice does not exist, is not part of this admin's
 *   organization, is deleted, or is not in draft/active status
 * @throws {Error} If the billing code does not exist, is inactive, or is
 *   deleted
 * @throws {Error} If an item with the same billing_code already exists under
 *   this invoice
 */
export async function posthealthcarePlatformOrganizationAdminBillingInvoicesBillingInvoiceIdBillingItems(props: {
  organizationAdmin: OrganizationadminPayload;
  billingInvoiceId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformBillingItem.ICreate;
}): Promise<IHealthcarePlatformBillingItem> {
  // Step 1: Fetch invoice and check organization association and not deleted
  const invoice =
    await MyGlobal.prisma.healthcare_platform_billing_invoices.findFirst({
      where: {
        id: props.billingInvoiceId,
        organization_id: props.organizationAdmin.id,
        deleted_at: null,
      },
    });
  if (!invoice) {
    throw new Error(
      "Invoice does not exist, is not part of your organization, or has been deleted.",
    );
  }
  // Prevent adding to closed or canceled invoices
  if (!(invoice.status === "draft" || invoice.status === "active")) {
    throw new Error(
      "Billing items may be added only to draft or active invoices.",
    );
  }
  // Step 2: Validate the billing code exists/active/not deleted
  const billingCode =
    await MyGlobal.prisma.healthcare_platform_billing_codes.findFirst({
      where: {
        id: props.body.billing_code_id,
        active: true,
        deleted_at: null,
      },
    });
  if (!billingCode) {
    throw new Error(
      "The specified billing code does not exist, is not active, or has been deleted.",
    );
  }
  // Step 3: Uniqueness enforcement for billing_code_id under this invoice
  const alreadyExists =
    await MyGlobal.prisma.healthcare_platform_billing_items.findFirst({
      where: {
        invoice_id: props.billingInvoiceId,
        billing_code_id: props.body.billing_code_id,
        deleted_at: null,
      },
    });
  if (alreadyExists) {
    throw new Error(
      "This billing code already exists as an item for this invoice.",
    );
  }
  // Step 4: Generate UUID and audit fields, and create billing item
  const now = toISOStringSafe(new Date());
  const itemId = v4();
  const totalAmount = props.body.quantity * props.body.unit_price;
  const createdItem =
    await MyGlobal.prisma.healthcare_platform_billing_items.create({
      data: {
        id: itemId,
        invoice_id: props.billingInvoiceId,
        billing_code_id: props.body.billing_code_id,
        description: props.body.description,
        quantity: props.body.quantity,
        unit_price: props.body.unit_price,
        total_amount: totalAmount,
        created_at: now,
        updated_at: now,
      },
    });
  // Step 5: Build return DTO (all date fields as string, no Date type anywhere)
  return {
    id: createdItem.id,
    invoice_id: createdItem.invoice_id,
    billing_code_id: createdItem.billing_code_id,
    description: createdItem.description,
    quantity: createdItem.quantity,
    unit_price: createdItem.unit_price,
    total_amount: createdItem.total_amount,
    created_at: createdItem.created_at,
    updated_at: createdItem.updated_at,
    deleted_at: createdItem.deleted_at ?? undefined,
  };
}
