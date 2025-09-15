import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformBillingInvoice } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingInvoice";
import { IPageIHealthcarePlatformBillingInvoice } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformBillingInvoice";
import { DepartmentheadPayload } from "../decorators/payload/DepartmentheadPayload";

/**
 * Search and paginate billing invoices (BillingInvoices table) by business
 * filters for finance/admin roles.
 *
 * Retrieves a filtered, paginated summary list of billing invoices accessible
 * to department heads within their organization. Applies business criteria such
 * as patient, status, description, and creation date range, with strong
 * multi-tenant security enforcement. Results are presented in compact,
 * analyzable summaries per the contract schema.
 *
 * @param props - Request properties
 * @param props.departmentHead - The authenticated department head making the
 *   request
 * @param props.body - Search and filter query data for invoices
 * @returns Paginated summary list of invoices matching filters & access
 *   constraints
 * @throws {Error} If access to requested organization or resource is not
 *   allowed
 */
export async function patchhealthcarePlatformDepartmentHeadBillingInvoices(props: {
  departmentHead: DepartmentheadPayload;
  body: IHealthcarePlatformBillingInvoice.IRequest;
}): Promise<IPageIHealthcarePlatformBillingInvoice.ISummary> {
  const { departmentHead, body } = props;

  // ===================
  // Tenant Isolation: Only allow invoices for the department head's org scope.
  // Requires organization_id to match department head's org context (DTO and E2E)
  // ===================
  if (!body.organization_id || body.organization_id !== departmentHead.id) {
    throw new Error(
      "Forbidden: Cannot access billing invoices outside organization scope",
    );
  }

  // ===================
  // Pagination Setup
  // ===================
  const pageValue = body.page ?? 1;
  const limitValue = body.limit ?? 20;
  const currentPage = Number(pageValue);
  const currentLimit = Number(limitValue);
  const skip = (currentPage - 1) * currentLimit;

  // ===================
  // Filtering Logic & Security
  // ===================
  // Null/undefined checks are required for Prisma strict type matching
  const where = {
    deleted_at: null,
    organization_id: body.organization_id,
    ...(body.patient_id !== undefined &&
      body.patient_id !== null && { patient_id: body.patient_id }),
    ...(body.invoice_number !== undefined &&
      body.invoice_number !== null && {
        invoice_number: body.invoice_number,
      }),
    ...(body.status !== undefined &&
      body.status !== null && { status: body.status }),
    ...(body.description !== undefined &&
      body.description !== null && {
        description: { contains: body.description },
      }),
    ...((body.created_at_from !== undefined && body.created_at_from !== null) ||
    (body.created_at_to !== undefined && body.created_at_to !== null)
      ? {
          created_at: {
            ...(body.created_at_from !== undefined &&
              body.created_at_from !== null && {
                gte: body.created_at_from,
              }),
            ...(body.created_at_to !== undefined &&
              body.created_at_to !== null && {
                lte: body.created_at_to,
              }),
          },
        }
      : {}),
  };

  // ===================
  // Fetch Data/Total with Pagination
  // ===================
  const [records, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_billing_invoices.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: currentLimit,
      select: {
        id: true,
        invoice_number: true,
        status: true,
        total_amount: true,
        currency: true,
        patient_id: true,
        due_date: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.healthcare_platform_billing_invoices.count({ where }),
  ]);

  // ===================
  // Transform & Enforce DTO field branding (esp. ISO for dates, optional/required)
  // ===================
  const data = records.map((rec) => {
    // Only set patient_id and due_date if non-null (for optional DTO fields)
    const summary: IHealthcarePlatformBillingInvoice.ISummary = {
      id: rec.id,
      invoice_number: rec.invoice_number,
      status: rec.status,
      total_amount: rec.total_amount,
      currency: rec.currency,
      ...(rec.patient_id ? { patient_id: rec.patient_id } : {}),
      ...(rec.due_date ? { due_date: toISOStringSafe(rec.due_date) } : {}),
      created_at: toISOStringSafe(rec.created_at),
    };
    return summary;
  });

  // Strict pagination - strip brands to base number for IPage.IPagination
  const pagination = {
    current: Number(currentPage),
    limit: Number(currentLimit),
    records: Number(total),
    pages: Math.ceil(Number(total) / (currentLimit || 1)),
  };

  return { pagination, data };
}
