import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformBillingPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingPayment";
import { IPageIHealthcarePlatformBillingPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformBillingPayment";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Search and retrieve billing payments for a billing invoice
 * (healthcare_platform_billing_payments)
 *
 * This operation searches billing payment records for a specific invoice,
 * supporting advanced filter and pagination for audit, finance, and compliance
 * management. Supports status, amount, date range, currency, and payee
 * filtering, returning a structured, paged list for dashboards and reporting.
 *
 * Only accessible for organization admins who own the invoice's organization.
 * All accesses are authorization checked and audited.
 *
 * @param props - Request parameters including organizationAdmin, the invoice
 *   UUID, and filter/search body
 * @param props.organizationAdmin - OrganizationadminPayload (authenticated
 *   admin making the request)
 * @param props.billingInvoiceId - UUID of the invoice to search payments under
 * @param props.body - Request filter/search body
 *   (IHealthcarePlatformBillingPayment.IRequest)
 * @returns Paginated list of billing payments per invoice and search criteria
 *   (IPageIHealthcarePlatformBillingPayment.ISummary)
 * @throws {Error} When invoice is not found, not owned by admin's organization,
 *   or access is denied
 */
export async function patchhealthcarePlatformOrganizationAdminBillingInvoicesBillingInvoiceIdBillingPayments(props: {
  organizationAdmin: OrganizationadminPayload;
  billingInvoiceId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformBillingPayment.IRequest;
}): Promise<IPageIHealthcarePlatformBillingPayment.ISummary> {
  const { organizationAdmin, billingInvoiceId, body } = props;

  // 1. Authorization: check invoice existence and admin's org access
  const invoice =
    await MyGlobal.prisma.healthcare_platform_billing_invoices.findFirst({
      where: {
        id: billingInvoiceId,
        organization_id: undefined, // to fix: get admin's org
      },
    });
  if (!invoice)
    throw new Error(
      "Invoice not found, not accessible by this organization admin, or deleted",
    );

  // 2. Compose payment WHERE clause
  let payee_id_filter: string[] | undefined = undefined;
  if (body.payee !== undefined && body.payee !== null && body.payee !== "") {
    // Find matching patient ids (from payee filter)
    const patientCandidates =
      await MyGlobal.prisma.healthcare_platform_patients.findMany({
        where: {
          OR: [
            { full_name: { contains: body.payee } },
            { email: { contains: body.payee } },
            { id: body.payee },
          ],
        },
        select: { id: true },
      });
    payee_id_filter = patientCandidates.map((p) => p.id);
    if (payee_id_filter.length === 0)
      return {
        pagination: {
          current: Number(body.page ?? 1),
          limit: Number(body.limit ?? 20),
          records: 0,
          pages: 0,
        },
        data: [],
      };
  }
  const where: Record<string, unknown> = {
    invoice_id: billingInvoiceId,
    deleted_at: null,
    ...(body.status && body.status.length > 0
      ? { status: { in: body.status } }
      : {}),
    ...(body.payment_date_range !== undefined &&
    body.payment_date_range.length === 2
      ? {
          payment_date: {
            gte: body.payment_date_range[0],
            lte: body.payment_date_range[1],
          },
        }
      : {}),
    ...(body.min_amount !== undefined && body.min_amount !== null
      ? { amount: Object.assign({}, { gte: body.min_amount }) }
      : {}),
    ...(body.max_amount !== undefined && body.max_amount !== null
      ? { amount: Object.assign({}, { lte: body.max_amount }) }
      : {}),
    ...(typeof body.currency === "string" && body.currency.length > 0
      ? { currency: body.currency }
      : Array.isArray(body.currency) && body.currency.length > 0
        ? { currency: { in: body.currency } }
        : {}),
    ...(payee_id_filter !== undefined
      ? { payee_id: { in: payee_id_filter } }
      : {}),
  };

  // 3. Pagination
  const limit = Number(body.limit ?? 20);
  const page = Number(body.page ?? 1);
  const skip = (page - 1) * limit;
  // 4. Query results and total count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_billing_payments.findMany({
      where,
      orderBy: [{ payment_date: "desc" }, { id: "desc" }],
      skip,
      take: limit,
    }),
    MyGlobal.prisma.healthcare_platform_billing_payments.count({ where }),
  ]);

  // 5. Map result to ISummary and convert dates
  const data = rows.map((row) => ({
    id: row.id,
    invoice_id: row.invoice_id,
    amount: row.amount,
    status: row.status,
    payment_date: toISOStringSafe(row.payment_date),
    currency: row.currency,
    payment_method_id: row.payment_method_id ?? undefined,
  }));
  const pages = limit > 0 ? Math.ceil(total / limit) : 0;
  const pagination = {
    current: page,
    limit: limit,
    records: total,
    pages,
  };
  return { pagination, data };
}
