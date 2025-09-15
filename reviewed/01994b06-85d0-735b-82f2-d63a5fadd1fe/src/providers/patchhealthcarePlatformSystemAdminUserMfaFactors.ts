import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformUserMfaFactor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformUserMfaFactor";
import { IPageIHealthcarePlatformUserMfaFactor } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformUserMfaFactor";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Search and list user MFA factors for security and compliance review.
 *
 * This operation enables system administrators to retrieve a paginated list of
 * all user MFA (Multi-Factor Authentication) factors in the healthcarePlatform
 * system with optional filters for user, type, status, and creation time. It
 * supports pagination, ordering, and safe, compliant result mapping.
 *
 * Authorization: Only authenticated systemAdmin users can access this endpoint.
 * Sensitive information such as provider credentials is never exposed.
 *
 * @param props - Request properties
 * @param props.systemAdmin - Authenticated SystemadminPayload. Only users with
 *   systemAdmin privileges may use this endpoint.
 * @param props.body - Filtering, pagination, and sorting details
 *   (IHealthcarePlatformUserMfaFactor.IRequest)
 * @returns Paginated list of MFA factors with metadata for compliance and audit
 *   reporting
 * @throws {Error} If the calling user is not an authorized system administrator
 */
export async function patchhealthcarePlatformSystemAdminUserMfaFactors(props: {
  systemAdmin: SystemadminPayload;
  body: IHealthcarePlatformUserMfaFactor.IRequest;
}): Promise<IPageIHealthcarePlatformUserMfaFactor> {
  const { systemAdmin, body } = props;
  // Authorization: system admin role check
  if (!systemAdmin || systemAdmin.type !== "systemAdmin") {
    throw new Error("Unauthorized: Only system admins can list MFA factors.");
  }

  // Pagination defaults and bounds
  const page = body.page && body.page >= 1 ? Number(body.page) : 1;
  const limit = body.limit && body.limit >= 1 ? Number(body.limit) : 20;

  // Sorting parsing: sort string e.g., 'created_at:desc'
  let sortField: "created_at" | "updated_at" | "priority" = "created_at";
  let sortDir: "asc" | "desc" = "desc";
  if (body.sort && typeof body.sort === "string" && body.sort.includes(":")) {
    const [rawField, rawDir] = body.sort.split(":");
    if (
      rawField === "created_at" ||
      rawField === "updated_at" ||
      rawField === "priority"
    )
      sortField = rawField;
    if (rawDir === "asc" || rawDir === "desc") sortDir = rawDir;
  }

  // Where clause construction (all optional filters): build in-place
  const where = {
    ...(body.user_id !== undefined &&
      body.user_id !== null && { user_id: body.user_id }),
    ...(body.user_type !== undefined &&
      body.user_type !== null && { user_type: body.user_type }),
    ...(body.factor_type !== undefined &&
      body.factor_type !== null && { factor_type: body.factor_type }),
    ...(body.is_active !== undefined &&
      body.is_active !== null && { is_active: body.is_active }),
    ...(body.created_at_from != null || body.created_at_to != null
      ? {
          created_at: {
            ...(body.created_at_from != null && { gte: body.created_at_from }),
            ...(body.created_at_to != null && { lte: body.created_at_to }),
          },
        }
      : {}),
  };

  // Query: rows and total count in parallel for pagination
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_user_mfa_factors.findMany({
      where,
      orderBy: { [sortField]: sortDir },
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.healthcare_platform_user_mfa_factors.count({ where }),
  ]);

  // Map to DTO: All date fields converted to ISO string, no Date types, exact type matches
  const data = rows.map((row) => ({
    id: row.id,
    user_id: row.user_id,
    user_type: row.user_type,
    factor_type: row.factor_type,
    factor_value: row.factor_value,
    priority: row.priority,
    is_active: row.is_active,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
  }));

  // Pagination object conforming to IPage.IPagination
  const pagination = {
    current: Number(page),
    limit: Number(limit),
    records: total,
    pages: Math.ceil(total / limit),
  };

  return {
    pagination,
    data,
  };
}
