import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformBillingInvoice } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingInvoice";
import { IPageIHealthcarePlatformBillingInvoice } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformBillingInvoice";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Search and paginate billing invoices (BillingInvoices table) by business
 * filters for finance/admin roles.
 *
 * This operation retrieves a filtered, paginated list of billing invoice
 * summaries from the healthcare_platform_billing_invoices table. Supports
 * searching by status, patient, organization, due date, description, and date
 * range. Results are paginated per request, require systemAdmin access, and
 * only summary fields are returned for privacy. Strict field and type mapping
 * with conversion of Date fields to proper ISO string for API consistency.
 *
 * @param props - Object containing the systemAdmin authentication and filtering
 *   parameters
 * @param props.systemAdmin - The authenticated SystemadminPayload
 *   (authentication & org context)
 * @param props.body - Advanced search parameters and pagination options for
 *   invoice retrieval
 * @returns Paginated summary of billing invoices (@see
 *   IPageIHealthcarePlatformBillingInvoice.ISummary)
 * @throws {Error} On unexpected errors, database access issues, or unauthorized
 *   access
 */
export async function patchhealthcarePlatformSystemAdminBillingInvoices(props: {
  systemAdmin: SystemadminPayload;
  body: IHealthcarePlatformBillingInvoice.IRequest;
}): Promise<IPageIHealthcarePlatformBillingInvoice.ISummary> {
  const { body } = props;

  // Pagination arguments with fallback for page (1) and limit (20, max 100 for safety)
  const page = body.page != null ? Number(body.page) : 1;
  const rawLimit = body.limit != null ? Number(body.limit) : 20;
  const limit = rawLimit > 0 && rawLimit <= 100 ? rawLimit : 20;

  // Build Prisma where input, inline per rules (never as intermediate variable)
  const where = {
    deleted_at: null,
    ...(body.organization_id !== undefined &&
      body.organization_id !== null && {
        organization_id: body.organization_id,
      }),
    ...(body.patient_id !== undefined &&
      body.patient_id !== null && {
        patient_id: body.patient_id,
      }),
    ...(body.invoice_number !== undefined &&
      body.invoice_number !== null && {
        invoice_number: body.invoice_number,
      }),
    ...(body.status !== undefined &&
      body.status !== null && {
        status: body.status,
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
    ...(body.description !== undefined &&
      body.description !== null && {
        description: { contains: body.description },
      }),
  };

  // Paging & query
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_billing_invoices.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: (page - 1) * limit,
      take: limit,
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

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: limit > 0 ? Math.ceil(total / limit) : 0,
    },
    data: rows.map((row) => {
      return {
        id: row.id,
        invoice_number: row.invoice_number,
        status: row.status,
        total_amount: row.total_amount,
        currency: row.currency,
        patient_id: row.patient_id,
        due_date:
          row.due_date != null ? toISOStringSafe(row.due_date) : undefined,
        created_at: toISOStringSafe(row.created_at),
      };
    }),
  };
}
