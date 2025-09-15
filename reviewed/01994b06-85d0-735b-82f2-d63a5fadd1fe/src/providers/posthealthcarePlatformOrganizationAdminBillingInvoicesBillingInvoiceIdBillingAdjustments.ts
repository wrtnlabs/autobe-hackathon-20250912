import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformBillingAdjustment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingAdjustment";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Create a billing adjustment for a given invoice
 * (healthcare_platform_billing_adjustments).
 *
 * This API operation allows an authorized organization admin to create a new
 * billing adjustment for an invoice or invoice item in the healthcarePlatform
 * system. The adjustment is linked to the correct invoice or item, business
 * logic and audit constraints are enforced, and adjustment meta fields are set
 * for compliance and traceability. Soft deletion is handled with deleted_at and
 * is not part of the create contract. Only users with organizationAdmin
 * privileges may use this.
 *
 * @param props - Object containing the billing invoice ID (path parameter),
 *   authenticated organization admin, and body for adjustment creation
 * @param props.organizationAdmin - The authenticated organization admin making
 *   the request
 * @param props.billingInvoiceId - The target billing invoice UUID
 * @param props.body - The adjustment creation DTO, which must contain at least
 *   invoice_id or item_id, a non-zero amount, type, and description
 * @returns The created adjustment as an IHealthcarePlatformBillingAdjustment
 *   object (id, invoice_id, item_id, adjustment_type, description, amount,
 *   created_at only)
 * @throws {Error} When required references are missing, amount is zero, or
 *   business policy validation fails
 */
export async function posthealthcarePlatformOrganizationAdminBillingInvoicesBillingInvoiceIdBillingAdjustments(props: {
  organizationAdmin: OrganizationadminPayload;
  billingInvoiceId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformBillingAdjustment.ICreate;
}): Promise<IHealthcarePlatformBillingAdjustment> {
  const { billingInvoiceId, body } = props;
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // Business rule: require at least one reference and amount !== 0
  if ((body.invoice_id == null && body.item_id == null) || body.amount === 0) {
    throw new Error(
      "Either invoice_id or item_id must be supplied, and amount must be non-zero",
    );
  }

  // Compose input fields for DB row
  const created =
    await MyGlobal.prisma.healthcare_platform_billing_adjustments.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        invoice_id: body.invoice_id ?? billingInvoiceId,
        item_id: body.item_id ?? undefined,
        adjustment_type: body.adjustment_type,
        description: body.description,
        amount: body.amount,
        created_at: now,
        updated_at: now,
      },
    });

  // Return compliant DTO with correct null/undefined for optionals
  return {
    id: created.id,
    invoice_id: created.invoice_id ?? undefined,
    item_id: created.item_id ?? undefined,
    adjustment_type: created.adjustment_type,
    description: created.description,
    amount: created.amount,
    created_at: toISOStringSafe(created.created_at),
  };
}
