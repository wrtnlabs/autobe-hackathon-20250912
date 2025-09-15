import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformLabOrderTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformLabOrderTransaction";
import { IPageIHealthcarePlatformLabOrderTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformLabOrderTransaction";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Retrieve/search laboratory order transactions with advanced filters and
 * pagination (healthcare_platform_lab_order_transactions table).
 *
 * Returns a filtered, paginated list of laboratory order submission events
 * mapped to IHealthcarePlatformLabOrderTransaction, supporting administrative
 * reporting, compliance, and operational troubleshooting scenarios. Only
 * accessible to organization admins for their own org. All filters are precise,
 * strictly match schema, and returned date/datetime fields are always in string
 * ISO format (string & tags.Format<'date-time'>), with correct null/undefined
 * handling for optional fields.
 *
 * @param props - The request props.
 * @param props.organizationAdmin - Authenticated organization admin (payload,
 *   required)
 * @param props.body - Lab order transaction search/filtering options
 * @returns Paginated result of lab order transactions matching the filter
 *   criteria, structured per IPageIHealthcarePlatformLabOrderTransaction
 * @throws {Error} Forbidden if attempt to search outside admin's org, or on
 *   DB/query error
 */
export async function patchhealthcarePlatformOrganizationAdminLabOrderTransactions(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IHealthcarePlatformLabOrderTransaction.IRequest;
}): Promise<IPageIHealthcarePlatformLabOrderTransaction> {
  const { organizationAdmin, body } = props;

  // Security: If orgId specified, it MUST match the authenticated admin organization
  if (
    body.organizationId !== undefined &&
    body.organizationId !== organizationAdmin.id
  ) {
    throw new Error(
      "Forbidden: Admins can only search their own organization.",
    );
  }

  // Always constrain to admin's organization
  const where: Record<string, unknown> = {
    healthcare_platform_organization_id: organizationAdmin.id,
    deleted_at: null,
    // Only add these filters if present and not null/undefined
    ...(body.labIntegrationId !== undefined &&
      body.labIntegrationId !== null && {
        lab_integration_id: body.labIntegrationId,
      }),
    ...(body.status !== undefined &&
      body.status !== null && {
        status: body.status,
      }),
    ...((body.dateFrom !== undefined && body.dateFrom !== null) ||
    (body.dateTo !== undefined && body.dateTo !== null)
      ? {
          requested_at: {
            ...(body.dateFrom !== undefined &&
              body.dateFrom !== null && {
                gte: body.dateFrom,
              }),
            ...(body.dateTo !== undefined &&
              body.dateTo !== null && {
                lte: body.dateTo,
              }),
          },
        }
      : {}),
  };

  // Sorting
  const sortField = body.sortBy === undefined ? "requested_at" : body.sortBy;
  const sortDirection =
    body.sortDirection === undefined ? "desc" : body.sortDirection;

  // Pagination defaults
  const rawPage = body.page === undefined ? 1 : body.page;
  const rawPageSize = body.pageSize === undefined ? 20 : body.pageSize;
  const page: number = Number(rawPage);
  const pageSize: number = Number(rawPageSize);
  const skip: number = (page - 1) * pageSize;

  // Query database
  const [rows, count] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_lab_order_transactions.findMany({
      where,
      orderBy: { [sortField]: sortDirection },
      skip,
      take: pageSize,
    }),
    MyGlobal.prisma.healthcare_platform_lab_order_transactions.count({ where }),
  ]);

  // Transform all Prisma Date fields to string & tags.Format<'date-time'> with null checks and correct structure
  const data = rows.map((row) => {
    return {
      id: row.id,
      healthcare_platform_organization_id:
        row.healthcare_platform_organization_id,
      lab_integration_id: row.lab_integration_id,
      external_lab_order_id: row.external_lab_order_id ?? undefined,
      status: row.status,
      status_message: row.status_message ?? undefined,
      requested_at: toISOStringSafe(row.requested_at),
      transmitted_at: row.transmitted_at
        ? toISOStringSafe(row.transmitted_at)
        : undefined,
      acknowledged_at: row.acknowledged_at
        ? toISOStringSafe(row.acknowledged_at)
        : undefined,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
      deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : undefined,
    };
  });

  return {
    pagination: {
      current: Number(page),
      limit: Number(pageSize),
      records: Number(count),
      pages: Number(Math.ceil(Number(count) / Number(pageSize))),
    },
    data,
  };
}
