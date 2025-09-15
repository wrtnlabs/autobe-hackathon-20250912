import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformPharmacyTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPharmacyTransaction";
import { IPageIHealthcarePlatformPharmacyTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformPharmacyTransaction";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Retrieve filtered and paginated list of pharmacy transactions
 * (healthcare_platform_pharmacy_transactions)
 *
 * This operation retrieves a filtered, paginated list of pharmacy transaction
 * records for the healthcarePlatform system. It supports searching, filtering,
 * and sorting across properties of the
 * healthcare_platform_pharmacy_transactions table, making it suitable for
 * operational review, troubleshooting, and compliance workflows. This endpoint
 * is essential for analyzing transaction outcomes with integrated pharmacies,
 * reviewing communication history, and handling error or escalation cases. The
 * response provides full detail per transaction, including linkage to
 * organization, pharmacy integration, transaction type, statuses, timing, and
 * audit metadata, but does NOT include any modification or write operations as
 * pharmacy transactions are created solely by system workflows or
 * integrations.
 *
 * Only authorized organization admins can access this endpoint. All queries are
 * automatically restricted to the authenticated admin's organization. No data
 * for other organizations is ever returned.
 *
 * @param props - Parameters for this query
 * @param props.organizationAdmin - The authenticated organization admin
 * @param props.body - Query request including filters, pagination, and sort
 * @returns Paginated list of matching pharmacy transactions with full detail,
 *   and pagination metadata
 * @throws {Error} If any database error or internal logic fault occurs
 */
export async function patchhealthcarePlatformOrganizationAdminPharmacyTransactions(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IHealthcarePlatformPharmacyTransaction.IRequest;
}): Promise<IPageIHealthcarePlatformPharmacyTransaction> {
  const { organizationAdmin, body } = props;
  const page = body.page ?? 1;
  const page_size = body.page_size ?? 20;
  const skip = (page - 1) * page_size;

  // Tenant boundary: Only allow viewing transactions for THIS admin's organization
  const where = {
    healthcare_platform_organization_id: organizationAdmin.id,
    ...(body.pharmacy_integration_id !== undefined &&
      body.pharmacy_integration_id !== null && {
        pharmacy_integration_id: body.pharmacy_integration_id,
      }),
    ...(body.transaction_type !== undefined &&
      body.transaction_type !== null && {
        transaction_type: body.transaction_type,
      }),
    ...(body.status !== undefined &&
      body.status !== null && {
        status: body.status,
      }),
    ...(body.transaction_date_range !== undefined &&
      Array.isArray(body.transaction_date_range) &&
      body.transaction_date_range.length === 2 && {
        requested_at: {
          gte: body.transaction_date_range[0],
          lte: body.transaction_date_range[1],
        },
      }),
    deleted_at: null,
  };

  // Sorting: Only allow fields that exist in schema
  let orderBy = { requested_at: "desc" };
  if (body.sort) {
    // Accept sort strings like "requested_at DESC" or "status asc"
    const parts = body.sort.trim().split(/\s+/);
    const field = parts[0];
    const dir = (parts[1] || "desc").toLowerCase() === "asc" ? "asc" : "desc";
    // Validate field (against schema-verified fields)
    const allowedFields = [
      "requested_at",
      "created_at",
      "updated_at",
      "status",
      "transaction_type",
    ];
    if (field && allowedFields.includes(field)) {
      orderBy = { [field]: dir };
    }
  }

  // Fetch data + count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_pharmacy_transactions.findMany({
      where,
      skip,
      take: page_size,
      orderBy,
    }),
    MyGlobal.prisma.healthcare_platform_pharmacy_transactions.count({ where }),
  ]);

  // Map database to DTO output, converting all date fields properly
  const data = rows.map((item) => {
    return {
      id: item.id,
      healthcare_platform_organization_id:
        item.healthcare_platform_organization_id,
      pharmacy_integration_id: item.pharmacy_integration_id,
      transaction_type: item.transaction_type,
      external_transaction_id: item.external_transaction_id ?? undefined,
      status: item.status,
      status_message: item.status_message ?? undefined,
      payload_reference: item.payload_reference ?? undefined,
      requested_at: toISOStringSafe(item.requested_at),
      transmitted_at: item.transmitted_at
        ? toISOStringSafe(item.transmitted_at)
        : undefined,
      acknowledged_at: item.acknowledged_at
        ? toISOStringSafe(item.acknowledged_at)
        : undefined,
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
      deleted_at: item.deleted_at
        ? toISOStringSafe(item.deleted_at)
        : undefined,
    };
  });

  return {
    pagination: {
      current: Number(page),
      limit: Number(page_size),
      records: total,
      pages: Math.ceil(total / page_size),
    },
    data,
  };
}
