import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformBillingPaymentPlan } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingPaymentPlan";
import { IPageIHealthcarePlatformBillingPaymentPlan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformBillingPaymentPlan";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Search and retrieve paginated list of payment plans for a billing invoice
 *
 * This operation retrieves a paginated list of payment plans associated with a
 * specific billing invoice. It enables authorized users (organization
 * administrators, billing staff) to search, filter, and sort
 * installment/payment plans for an invoice, supporting workflows for patient
 * self-pay, insurance arrangements, and audit. All retrieval and listing are
 * bound to the organization and patient context, with compliance audit trails
 * for each access. All date and date-time fields in the DTO are formatted as
 * strings using toISOStringSafe (never as Date types).
 *
 * @param props - Parameters for the operation
 * @param props.organizationAdmin - Authenticated organization administrator
 *   (OrganizationadminPayload)
 * @param props.billingInvoiceId - Billing invoice UUID
 * @param props.body - Query filters and pagination options
 *   (IHealthcarePlatformBillingPaymentPlan.IRequest)
 * @returns Paginated results of payment plan summaries for the specified
 *   billing invoice
 * @throws Error if the invoice does not exist or is not accessible by the given
 *   organizationAdmin
 */
export async function patchhealthcarePlatformOrganizationAdminBillingInvoicesBillingInvoiceIdBillingPaymentPlans(props: {
  organizationAdmin: OrganizationadminPayload;
  billingInvoiceId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformBillingPaymentPlan.IRequest;
}): Promise<IPageIHealthcarePlatformBillingPaymentPlan.ISummary> {
  const { organizationAdmin, billingInvoiceId, body } = props;

  // 1. Authorization: Confirm the admin's organization owns the target invoice
  const invoice =
    await MyGlobal.prisma.healthcare_platform_billing_invoices.findFirst({
      where: {
        id: billingInvoiceId,
        organization_id: organizationAdmin.organization_id,
      },
      select: { id: true },
    });
  if (!invoice) {
    throw new Error(
      "Unauthorized: Invoice not found or not in your organization",
    );
  }
  // 2. Build WHERE clause for core and additional filters
  const where: Record<string, unknown> = {
    invoice_id: billingInvoiceId,
    deleted_at: null,
    ...(body.plan_type && { plan_type: body.plan_type }),
    ...(body.status && { status: body.status }),
    ...(body.start_date && { start_date: body.start_date }),
    ...(body.end_date && { end_date: body.end_date }),
    ...(body.total_amount_min !== undefined && {
      total_amount: { gte: body.total_amount_min },
    }),
    ...(body.total_amount_max !== undefined && {
      total_amount: {
        ...(body.total_amount_min !== undefined && {
          gte: body.total_amount_min,
        }),
        lte: body.total_amount_max,
      },
    }),
  };

  // Remove redundant total_amount gte filter if both min and max present
  if (
    body.total_amount_min !== undefined &&
    body.total_amount_max !== undefined
  ) {
    where.total_amount = {
      gte: body.total_amount_min,
      lte: body.total_amount_max,
    };
  }

  // 3. Sorting
  const sortBy = body.sort ?? "created_at";
  const sortOrder = body.order ?? "desc";
  const orderBy = { [sortBy]: sortOrder };

  // 4. Pagination
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // 5. Query database for results and total
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_billing_payment_plans.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        invoice_id: true,
        plan_type: true,
        status: true,
        total_amount: true,
        start_date: true,
        end_date: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.healthcare_platform_billing_payment_plans.count({ where }),
  ]);

  // 6. Map DB records to API DTO format
  const data = rows.map((row) => {
    // Narrow status to the DTO literal union for API hygiene
    void typia.assertGuard<
      "active" | "completed" | "defaulted" | "cancelled" | "expired"
    >(row.status);
    return {
      id: row.id,
      invoice_id: row.invoice_id,
      plan_type: row.plan_type,
      status: row.status,
      total_amount: row.total_amount,
      start_date: toISOStringSafe(row.start_date),
      end_date:
        row.end_date !== null ? toISOStringSafe(row.end_date) : undefined,
      created_at: toISOStringSafe(row.created_at),
      updated_at: row.updated_at ? toISOStringSafe(row.updated_at) : undefined,
    };
  });

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data,
  };
}
