import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformBillingPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingPaymentMethod";
import { IPageIHealthcarePlatformBillingPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformBillingPaymentMethod";

/**
 * Search and retrieve a filtered, paginated list of payment methods
 * (healthcare_platform_billing_payment_methods table) available for billing in
 * the healthcare platform.
 *
 * Retrieves a paginated list of billing payment methods (credit card, ACH,
 * insurance, etc) available in the platform. Supports search, filtering, and
 * sorting by all allowed fields, with paging and total count for UI
 * consumption.
 *
 * @param props - Parameters for search/filter/pagination via request body
 *   (IHealthcarePlatformBillingPaymentMethod.IRequest)
 * @returns Paginated list of ISummary records with IPage-style pagination
 * @throws {Error} If filters are invalid or a sort field is not allowed
 */
export async function patchhealthcarePlatformBillingPaymentMethods(props: {
  body: IHealthcarePlatformBillingPaymentMethod.IRequest;
}): Promise<IPageIHealthcarePlatformBillingPaymentMethod.ISummary> {
  const { body } = props;

  // Parse and normalize pagination
  const page = body.page ?? 1;
  const pageSize = body.page_size ?? 20;
  const skip = (page - 1) * pageSize;

  // Build WHERE object for Prisma
  const where = {
    ...(body.organization_id !== undefined
      ? { organization_id: body.organization_id }
      : {}),
    ...(body.method_type !== undefined
      ? { method_type: body.method_type }
      : {}),
    ...(body.provider_name !== undefined
      ? { provider_name: body.provider_name }
      : {}),
    ...(body.is_active !== undefined ? { is_active: body.is_active } : {}),
  };

  // Handle sort: allow sort fields (method_type, provider_name, is_active), else default
  let orderBy: { [key: string]: "asc" | "desc" };
  if (body.sort) {
    const desc = body.sort.startsWith("-");
    const field = desc ? body.sort.slice(1) : body.sort;
    // Only allow sorting by safe fields
    if (
      ["method_type", "provider_name", "is_active", "created_at"].includes(
        field,
      )
    ) {
      orderBy = { [field]: desc ? "desc" : "asc" };
    } else {
      throw new Error(`Invalid sort field: ${field}`);
    }
  } else {
    orderBy = { created_at: "desc" };
  }

  // Run paged query + count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_billing_payment_methods.findMany({
      where,
      orderBy,
      skip,
      take: pageSize,
      select: {
        id: true,
        method_type: true,
        provider_name: true,
        is_active: true,
        organization_id: true,
      },
    }),
    MyGlobal.prisma.healthcare_platform_billing_payment_methods.count({
      where,
    }),
  ]);

  return {
    pagination: {
      current: Number(page), // convert to primitive number if it is tags branded
      limit: Number(pageSize),
      records: total,
      pages: Math.ceil(total / pageSize),
    },
    data: rows.map((row) => ({
      id: row.id,
      method_type: row.method_type,
      provider_name: row.provider_name ?? undefined,
      is_active: row.is_active,
      organization_id: row.organization_id,
    })),
  };
}
