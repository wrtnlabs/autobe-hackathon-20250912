import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformBillingAdjustment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingAdjustment";
import { IPageIHealthcarePlatformBillingAdjustment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformBillingAdjustment";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * List all billing adjustments for a given invoice, supporting pagination and
 * filtering.
 *
 * This operation retrieves a filtered and paginated list of billing adjustments
 * associated with a specific billing invoice. The billing adjustments are
 * stored in the healthcare_platform_billing_adjustments table and represent
 * discounts, write-offs, or corrections applied at either the invoice or item
 * level. This list endpoint enables authorized billing staff and administrators
 * to review all adjustments tied to the invoice for audit, financial review,
 * and workflow tracking.
 *
 * Access to this operation is restricted to billing staff, system
 * administrators, and organization administrators. All data is returned in
 * accordance with permission scopes, organizational boundaries, and audit
 * requirements. The operation is essential for financial reconciliation,
 * compliance audits, and patient billing inquiries.
 *
 * @param props - The props for this operation
 * @param props.systemAdmin - The JWT payload of the authenticated System
 *   Administrator
 * @param props.billingInvoiceId - Target invoice ID (UUID) whose adjustments
 *   are to be listed
 * @param props.body - Filter/search and pagination information
 * @returns Paginated list of billing adjustments for the invoice
 * @throws {Error} When access is denied or unexpected database errors occur
 */
export async function patchhealthcarePlatformSystemAdminBillingInvoicesBillingInvoiceIdBillingAdjustments(props: {
  systemAdmin: SystemadminPayload;
  billingInvoiceId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformBillingAdjustment.IRequest;
}): Promise<IPageIHealthcarePlatformBillingAdjustment> {
  const { billingInvoiceId, body } = props;
  // Extract filters with safe defaults
  const page = body.page ?? 1;
  const pageSize = body.pageSize ?? 20;
  const skip = (page - 1) * pageSize;
  const take = pageSize;

  // Build Prisma where condition inline (no Date, no intermediate objects)
  const where = {
    deleted_at: null,
    invoice_id: billingInvoiceId,
    ...(body.item_id !== undefined &&
      body.item_id !== null && {
        item_id: body.item_id,
      }),
    ...(body.adjustment_type !== undefined &&
      body.adjustment_type !== null && {
        adjustment_type: body.adjustment_type,
      }),
    ...((body.date_from !== undefined && body.date_from !== null) ||
    (body.date_to !== undefined && body.date_to !== null)
      ? {
          created_at: {
            ...(body.date_from !== undefined &&
              body.date_from !== null && { gte: body.date_from }),
            ...(body.date_to !== undefined &&
              body.date_to !== null && { lte: body.date_to }),
          },
        }
      : {}),
  };

  // Query for paged data and total count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_billing_adjustments.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take,
    }),
    MyGlobal.prisma.healthcare_platform_billing_adjustments.count({
      where,
    }),
  ]);

  // Map rows to the API DTO
  const data = rows.map((row) => ({
    id: row.id,
    invoice_id: row.invoice_id === null ? undefined : row.invoice_id,
    item_id: row.item_id === null ? undefined : row.item_id,
    adjustment_type: row.adjustment_type,
    description: row.description === null ? undefined : row.description,
    amount: row.amount,
    created_at: toISOStringSafe(row.created_at),
  }));

  // Assemble result with correct pagination branding
  return {
    pagination: {
      current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: pageSize as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / pageSize) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
    data,
  };
}
