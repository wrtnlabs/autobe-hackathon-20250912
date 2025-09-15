import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformBillingInvoice } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingInvoice";
import { IPageIHealthcarePlatformBillingInvoice } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformBillingInvoice";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Search and paginate billing invoices (BillingInvoices table) by business
 * filters for finance/admin roles.
 *
 * Retrieves a filtered, paginated list of summary records from the
 * healthcare_platform_billing_invoices table. Only users with organizationAdmin
 * role can query invoices scoped to their own organization. Supports searching
 * by status, patient, invoice number, date range, and description with proper
 * pagination. Results exclude invoices marked as deleted.
 *
 * @param props - OrganizationAdmin: The authenticated OrganizationadminPayload
 *   (organization admin user performing the query) body: Filtering, searching,
 *   and pagination criteria (see IHealthcarePlatformBillingInvoice.IRequest)
 * @returns Paginated summary list of matching billing invoices as per filters
 *   in IPageIHealthcarePlatformBillingInvoice.ISummary
 * @throws {Error} When attempting to list invoices for a different organization
 *   or when access is unauthorized
 */
export async function patchhealthcarePlatformOrganizationAdminBillingInvoices(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IHealthcarePlatformBillingInvoice.IRequest;
}): Promise<IPageIHealthcarePlatformBillingInvoice.ISummary> {
  const { organizationAdmin, body } = props;

  // Enforce strict organization scope
  if (
    body.organization_id !== undefined &&
    body.organization_id !== null &&
    body.organization_id !== organizationAdmin.id
  ) {
    throw new Error(
      "Forbidden: Cannot search invoices outside your organization scope.",
    );
  }

  // Paging normalization
  const page =
    body.page !== undefined && body.page !== null && body.page > 0
      ? Number(body.page)
      : 1;
  const limit =
    body.limit !== undefined && body.limit !== null && body.limit > 0
      ? Number(body.limit)
      : 20;
  const skip = (page - 1) * limit;

  // Where clause construction
  const where = {
    organization_id: organizationAdmin.id,
    deleted_at: null,
    ...(body.patient_id !== undefined && body.patient_id !== null
      ? { patient_id: body.patient_id }
      : {}),
    ...(body.invoice_number !== undefined && body.invoice_number !== null
      ? { invoice_number: body.invoice_number }
      : {}),
    ...(body.status !== undefined && body.status !== null
      ? { status: body.status }
      : {}),
    ...((body.created_at_from !== undefined && body.created_at_from !== null) ||
    (body.created_at_to !== undefined && body.created_at_to !== null)
      ? {
          created_at: {
            ...(body.created_at_from !== undefined &&
              body.created_at_from !== null && { gte: body.created_at_from }),
            ...(body.created_at_to !== undefined &&
              body.created_at_to !== null && { lte: body.created_at_to }),
          },
        }
      : {}),
    ...(body.description !== undefined && body.description !== null
      ? { description: { contains: body.description } }
      : {}),
  };

  // Fetch results and total count concurrently
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_billing_invoices.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
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
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Math.ceil(Number(total) / Number(limit)),
    },
    data: rows.map((row) => ({
      id: row.id,
      invoice_number: row.invoice_number,
      status: row.status,
      total_amount: row.total_amount,
      currency: row.currency,
      patient_id: row.patient_id,
      due_date: row.due_date ? toISOStringSafe(row.due_date) : undefined,
      created_at: toISOStringSafe(row.created_at),
    })),
  };
}
