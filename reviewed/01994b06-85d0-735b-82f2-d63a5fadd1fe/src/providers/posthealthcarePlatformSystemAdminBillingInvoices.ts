import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformBillingInvoice } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingInvoice";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Create a new billing invoice (IHealthcarePlatformBillingInvoice)
 *
 * This operation creates a new billing invoice based on the provided payload,
 * respecting all compliance and audit requirements. A unique invoice record is
 * generated with immutable creation and update timestamps, and all optional
 * fields treated according to both DTO and schema rules.
 *
 * Only system administrators (systemAdmin) may call this endpoint. Business
 * validation and unique invoice_number enforcement are handled at the database
 * level. Any violation (such as duplicate invoice_number in the same
 * organization) will result in a thrown error.
 *
 * @param props - Required properties for creating an invoice
 * @param props.systemAdmin - Authenticated system administrator issuing the
 *   invoice
 * @param props.body - Fields for the billing invoice to create
 *   (IHealthcarePlatformBillingInvoice.ICreate)
 * @returns The newly-created billing invoice resource compliant with
 *   IHealthcarePlatformBillingInvoice
 * @throws {Error} If database-level (e.g., duplicate invoice) or other errors
 *   occur during insert
 */
export async function posthealthcarePlatformSystemAdminBillingInvoices(props: {
  systemAdmin: SystemadminPayload;
  body: IHealthcarePlatformBillingInvoice.ICreate;
}): Promise<IHealthcarePlatformBillingInvoice> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.healthcare_platform_billing_invoices.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        organization_id: props.body.organization_id,
        patient_id: props.body.patient_id,
        encounter_id: props.body.encounter_id ?? null,
        invoice_number: props.body.invoice_number,
        description: props.body.description ?? null,
        status: props.body.status,
        total_amount: props.body.total_amount,
        currency: props.body.currency,
        due_date: props.body.due_date ?? null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
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
