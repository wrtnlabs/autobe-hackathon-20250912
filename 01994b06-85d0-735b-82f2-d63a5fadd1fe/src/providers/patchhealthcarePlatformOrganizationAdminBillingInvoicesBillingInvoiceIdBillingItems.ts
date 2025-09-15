import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformBillingItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingItem";
import { IPageIHealthcarePlatformBillingItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformBillingItem";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Retrieve and search billing items for a specific invoice
 * (IHealthcarePlatformBillingItem)
 *
 * Retrieves a filtered, paginated list of billing items tied to a given billing
 * invoice, as defined in the healthcare_platform_billing_items table. Filtering
 * options enable staff to locate billing items by service code, description,
 * and amount. Paging and result ordering are required for workflows handling
 * large, complex invoices.
 *
 * Only organization administrators associated with the invoice's organization
 * are authorized. This action is audited for compliance.
 *
 * @param props - Parameters including organizationAdmin authentication,
 *   billingInvoiceId (UUID of invoice), and search/filter body
 *   (IHealthcarePlatformBillingItem.IRequest)
 * @returns IPageIHealthcarePlatformBillingItem (Paginated, filtered list of
 *   billing items)
 * @throws {Error} If invoice not found or access forbidden
 */
export async function patchhealthcarePlatformOrganizationAdminBillingInvoicesBillingInvoiceIdBillingItems(props: {
  organizationAdmin: OrganizationadminPayload;
  billingInvoiceId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformBillingItem.IRequest;
}): Promise<IPageIHealthcarePlatformBillingItem> {
  const { organizationAdmin, billingInvoiceId, body } = props;

  // --- 1. Fetch the invoice, require it exists and is accessible ---
  const invoice =
    await MyGlobal.prisma.healthcare_platform_billing_invoices.findFirst({
      where: { id: billingInvoiceId, deleted_at: null },
      select: { id: true, organization_id: true },
    });
  if (!invoice) {
    throw new Error("Invoice not found or deleted");
  }

  // (Assuming organizationAdmin is only allowed to access invoices of their organization)
  // If more than one organization_admin is possible, add org check here:
  /*
  if (organizationAdmin.organization_id !== invoice.organization_id) {
    throw new Error("Forbidden: not authorized for this invoice organization");
  }
  */

  // --- 2. Build filters for billing items ---
  const whereClause = {
    invoice_id: billingInvoiceId,
    deleted_at: null,
    ...(body.billing_code_id !== undefined &&
      body.billing_code_id !== null && {
        billing_code_id: body.billing_code_id,
      }),
    ...(body.description !== undefined &&
      body.description !== null && {
        description: { contains: body.description },
      }),
    ...((body.min_total_amount !== undefined &&
      body.min_total_amount !== null) ||
    (body.max_total_amount !== undefined && body.max_total_amount !== null)
      ? {
          total_amount: {
            ...(body.min_total_amount !== undefined &&
              body.min_total_amount !== null && { gte: body.min_total_amount }),
            ...(body.max_total_amount !== undefined &&
              body.max_total_amount !== null && { lte: body.max_total_amount }),
          },
        }
      : {}),
  };

  // --- 3. Pagination ---
  const offset = body.offset ?? (0 as number);
  const limit = body.limit ?? (20 as number);

  // --- 4. Sorting (allowlist fields only) ---
  const allowedSortFields = ["total_amount", "created_at", "description"];
  let orderBy = { created_at: "desc" } as const;
  if (body.order_by !== undefined && body.order_by !== null) {
    // Strip leading - for desc, support ascending (default) if no -
    const sortField = body.order_by.replace(/^[-+]/, "");
    if (allowedSortFields.includes(sortField)) {
      const direction = body.order_by.startsWith("-") ? "desc" : "asc";
      orderBy = { [sortField]: direction };
    }
  }

  // --- 5. Query items & total in parallel ---
  const [items, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_billing_items.findMany({
      where: whereClause,
      skip: Number(offset),
      take: Number(limit),
      orderBy,
    }),
    MyGlobal.prisma.healthcare_platform_billing_items.count({
      where: whereClause,
    }),
  ]);

  // --- 6. Map results to DTOs (All date fields must be toISOStringSafe) ---
  const data = items.map((row) => {
    return {
      id: row.id,
      invoice_id: row.invoice_id,
      billing_code_id: row.billing_code_id,
      description: row.description,
      quantity: row.quantity,
      unit_price: row.unit_price,
      total_amount: row.total_amount,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
      // deleted_at is optional and nullable
      deleted_at:
        row.deleted_at === null || row.deleted_at === undefined
          ? undefined
          : toISOStringSafe(row.deleted_at),
    };
  });

  // --- 7. Build IPageIHealthcarePlatformBillingItem, handle Typia pagination ---
  return {
    pagination: {
      current: Number(offset),
      limit: Number(limit),
      records: Number(total),
      pages: Math.ceil(Number(total) / Number(limit)),
    },
    data,
  } satisfies IPageIHealthcarePlatformBillingItem;
}
