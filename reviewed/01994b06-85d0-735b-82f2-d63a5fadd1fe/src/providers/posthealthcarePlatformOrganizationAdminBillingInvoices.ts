import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformBillingInvoice } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingInvoice";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Create a new billing invoice (IHealthcarePlatformBillingInvoice)
 *
 * This operation creates a new billing invoice in the healthcare platform
 * system, allowing authorized organization administrators to issue patient
 * invoices linked to encounters, services, and payer context. Strict audit and
 * compliance are enforced: duplicate invoice_number per organization is not
 * allowed, all business and timestamp fields are set immutably, and no native
 * Date types are used anywhere. All fields are type-safe and structurally
 * mapped to IHealthcarePlatformBillingInvoice. The operation triggers relevant
 * audit and reconciliation workflows elsewhere in the system.
 *
 * @param props - Object containing the organization admin authentication and
 *   creation request.
 * @param props.organizationAdmin - The authenticated organization admin
 *   payload.
 * @param props.body - The creation request data for the billing invoice,
 *   including organization, patient, encounter, status, and amount fields.
 * @returns The newly created billing invoice, fully populated and type-branded.
 * @throws {Error} If the invoice_number is already used in this organization.
 */
export async function posthealthcarePlatformOrganizationAdminBillingInvoices(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IHealthcarePlatformBillingInvoice.ICreate;
}): Promise<IHealthcarePlatformBillingInvoice> {
  const { organizationAdmin, body } = props;

  // Step 1: Ensure invoice_number is unique for organization (soft-deleted invoices excluded)
  const duplicate =
    await MyGlobal.prisma.healthcare_platform_billing_invoices.findFirst({
      where: {
        organization_id: body.organization_id,
        invoice_number: body.invoice_number,
        deleted_at: null,
      },
    });
  if (duplicate) {
    throw new Error("Duplicate invoice_number in organization");
  }

  // Step 2: Current timestamp as ISO string (never Date type)
  const now = toISOStringSafe(new Date());

  // Step 3: Create billing invoice, mapping nullables/optionals judiciously
  const created =
    await MyGlobal.prisma.healthcare_platform_billing_invoices.create({
      data: {
        id: v4(),
        organization_id: body.organization_id,
        patient_id: body.patient_id,
        encounter_id: body.encounter_id ?? null,
        invoice_number: body.invoice_number,
        description: body.description ?? null,
        status: body.status,
        total_amount: body.total_amount,
        currency: body.currency,
        due_date: body.due_date ?? null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

  // Step 4: Format and return DTO (map nullables to undefined for optionals as per DTO rules)
  return {
    id: created.id,
    organization_id: created.organization_id,
    patient_id: created.patient_id,
    encounter_id: created.encounter_id ?? undefined,
    invoice_number: created.invoice_number,
    description: created.description ?? undefined,
    status: created.status,
    total_amount: created.total_amount,
    currency: created.currency,
    due_date: created.due_date ?? undefined,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ?? undefined,
  };
}
