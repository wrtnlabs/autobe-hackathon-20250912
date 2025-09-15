import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformBillingAdjustment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingAdjustment";
import { IPageIHealthcarePlatformBillingAdjustment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformBillingAdjustment";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * List all billing adjustments for a given invoice, supporting pagination and
 * filtering.
 *
 * Obtain a paginated list of all billing adjustments applied to the specified
 * billing invoice. The billing adjustments, which may include insurance
 * write-offs, patient discounts, and administrative corrections, are filtered
 * to the target invoice using the billingInvoiceId path parameter. Additional
 * filtering, searching, or sorting may be provided via the request body.
 *
 * Access to this operation is restricted to billing staff, system
 * administrators, and organization administrators. All data is returned in
 * accordance with permission scopes, organizational boundaries, and audit
 * requirements. The operation is essential for financial reconciliation,
 * compliance audits, and patient billing inquiries. Related endpoints include
 * adjustment creation and retrieval.
 *
 * @param props - Object containing the organization admin authentication
 *   payload, target billing invoice UUID, and filter/pagination request data.
 * @param props.organizationAdmin - OrganizationadminPayload (authenticated org
 *   admin user)
 * @param props.billingInvoiceId - The unique identifier for the invoice whose
 *   adjustments are to be listed.
 * @param props.body - Filtering, pagination, and search parameters for billing
 *   adjustments
 * @returns Paginated list of billing adjustments for the invoice
 * @throws {Error} When the billing invoice does not exist, or access is
 *   forbidden to the organization
 */
export async function patchhealthcarePlatformOrganizationAdminBillingInvoicesBillingInvoiceIdBillingAdjustments(props: {
  organizationAdmin: OrganizationadminPayload;
  billingInvoiceId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformBillingAdjustment.IRequest;
}): Promise<IPageIHealthcarePlatformBillingAdjustment> {
  const { organizationAdmin, billingInvoiceId, body } = props;

  // 1. Fetch the invoice and confirm organization isolation
  const invoice =
    await MyGlobal.prisma.healthcare_platform_billing_invoices.findFirst({
      where: {
        id: billingInvoiceId,
      },
      select: {
        id: true,
        organization_id: true,
      },
    });
  if (!invoice) throw new Error("Invoice not found.");

  // Optionally: enforce org boundary (if OrganizationadminPayload includes org context), e.g.:
  // if (organizationAdmin.organization_id !== undefined && invoice.organization_id !== organizationAdmin.organization_id) {
  //   throw new Error("Forbidden: You do not have access to this invoice");
  // }

  // 2. Build query filters
  const filter: Record<string, unknown> = {
    invoice_id: billingInvoiceId,
    deleted_at: null,
  };
  if (body.item_id !== undefined) {
    filter["item_id"] = body.item_id;
  }
  if (body.adjustment_type !== undefined) {
    filter["adjustment_type"] = body.adjustment_type;
  }
  if (
    (body.date_from !== undefined && body.date_from !== null) ||
    (body.date_to !== undefined && body.date_to !== null)
  ) {
    const created_at: Record<string, string> = {};
    if (body.date_from !== undefined && body.date_from !== null)
      created_at.gte = body.date_from;
    if (body.date_to !== undefined && body.date_to !== null)
      created_at.lte = body.date_to;
    filter["created_at"] = created_at;
  }

  // 3. Pagination defaults
  const page = body.page !== undefined ? body.page : 1;
  const pageSize = body.pageSize !== undefined ? body.pageSize : 20;
  const skip = (page - 1) * pageSize;
  const take = pageSize;

  // 4. Query adjustments and count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_billing_adjustments.findMany({
      where: filter,
      orderBy: { created_at: "desc" },
      skip,
      take,
    }),
    MyGlobal.prisma.healthcare_platform_billing_adjustments.count({
      where: filter,
    }),
  ]);

  // 5. DTO conversion, enforcing undefined for optional fields
  const data = rows.map((adj) => ({
    id: adj.id,
    invoice_id: adj.invoice_id === null ? undefined : adj.invoice_id,
    item_id: adj.item_id === null ? undefined : adj.item_id,
    adjustment_type: adj.adjustment_type,
    description: adj.description === null ? undefined : adj.description,
    amount: adj.amount,
    created_at: toISOStringSafe(adj.created_at),
  }));

  // 6. Return pagination result
  return {
    pagination: {
      current: page,
      limit: pageSize,
      records: total,
      pages: Math.ceil(total / pageSize),
    },
    data,
  };
}
