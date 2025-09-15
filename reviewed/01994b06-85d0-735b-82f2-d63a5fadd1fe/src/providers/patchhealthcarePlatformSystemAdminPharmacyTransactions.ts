import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformPharmacyTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPharmacyTransaction";
import { IPageIHealthcarePlatformPharmacyTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformPharmacyTransaction";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Retrieve filtered and paginated list of pharmacy transactions
 * (healthcare_platform_pharmacy_transactions)
 *
 * This operation retrieves a list of pharmacy transaction records with
 * searching, filtering, and sorting for compliance, audit, and operational
 * analytics. Supports search across org/integration/type/status/date and
 * includes all relevant audit fields, strictly read-only (no mutation). Only
 * systemAdmin role may call this endpoint (authorization handled via
 * decorator). All date fields are returned as ISO string format; pagination and
 * sorting are fully supported.
 *
 * @param props - Object containing systemAdmin payload and
 *   filter/sort/pagination criteria
 * @param props.systemAdmin - Authenticated SystemadminPayload
 * @param props.body - Filtering, sorting, and pagination request for pharmacy
 *   transactions
 * @returns Paginated list of pharmacy transaction records with summary
 *   pagination info
 * @throws {Error} If database query fails or if parameters are invalid
 *   (filtered by typia pre-validation)
 */
export async function patchhealthcarePlatformSystemAdminPharmacyTransactions(props: {
  systemAdmin: SystemadminPayload;
  body: IHealthcarePlatformPharmacyTransaction.IRequest;
}): Promise<IPageIHealthcarePlatformPharmacyTransaction> {
  const { body } = props;
  const page = body.page ?? 1;
  const pageSize = body.page_size ?? 20;
  const skip = (page - 1) * pageSize;

  // Build orderBy for allowed sort fields (default: requested_at DESC)
  let orderBy: Record<string, "asc" | "desc"> = { requested_at: "desc" };
  if (body.sort) {
    const [field, order] = body.sort.trim().split(/\s+/);
    const allowedSortFields = [
      "requested_at",
      "created_at",
      "updated_at",
      "status",
    ];
    if (allowedSortFields.includes(field)) {
      orderBy = {
        [field]: order && order.toLowerCase() === "asc" ? "asc" : "desc",
      };
    }
  }

  // Build where clause with strict optionality and no Date/"as" usage
  const where: Record<string, unknown> = {
    deleted_at: null,
    ...(body.organization_id !== undefined && {
      healthcare_platform_organization_id: body.organization_id,
    }),
    ...(body.pharmacy_integration_id !== undefined && {
      pharmacy_integration_id: body.pharmacy_integration_id,
    }),
    ...(body.transaction_type !== undefined && {
      transaction_type: body.transaction_type,
    }),
    ...(body.status !== undefined && {
      status: body.status,
    }),
    ...(body.transaction_date_range &&
      body.transaction_date_range.length === 2 && {
        requested_at: {
          gte: body.transaction_date_range[0],
          lte: body.transaction_date_range[1],
        },
      }),
  };

  // Run queries in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_pharmacy_transactions.findMany({
      skip,
      take: pageSize,
      orderBy,
      where,
    }),
    MyGlobal.prisma.healthcare_platform_pharmacy_transactions.count({ where }),
  ]);

  // Map to DTO shape, converting all date fields
  const data = rows.map((tx) => ({
    id: tx.id,
    healthcare_platform_organization_id: tx.healthcare_platform_organization_id,
    pharmacy_integration_id: tx.pharmacy_integration_id,
    transaction_type: tx.transaction_type,
    external_transaction_id: tx.external_transaction_id ?? undefined,
    status: tx.status,
    status_message: tx.status_message ?? undefined,
    payload_reference: tx.payload_reference ?? undefined,
    requested_at: toISOStringSafe(tx.requested_at),
    transmitted_at: tx.transmitted_at
      ? toISOStringSafe(tx.transmitted_at)
      : undefined,
    acknowledged_at: tx.acknowledged_at
      ? toISOStringSafe(tx.acknowledged_at)
      : undefined,
    created_at: toISOStringSafe(tx.created_at),
    updated_at: toISOStringSafe(tx.updated_at),
    deleted_at: tx.deleted_at ? toISOStringSafe(tx.deleted_at) : undefined,
  }));

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
