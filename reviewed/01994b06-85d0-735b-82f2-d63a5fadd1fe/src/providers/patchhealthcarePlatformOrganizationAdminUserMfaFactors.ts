import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformUserMfaFactor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformUserMfaFactor";
import { IPageIHealthcarePlatformUserMfaFactor } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformUserMfaFactor";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Search and list user MFA factors for security and compliance review.
 *
 * This endpoint retrieves a paginated, filterable list of Multi-Factor
 * Authentication (MFA) factors for a user in the healthcarePlatform system.
 * Access is strictly limited: organization administrators may only query their
 * own MFA factor(s), never those belonging to other admins or users. Filters
 * are available for factor type, status, timestamps, etc. Sensitive credentials
 * such as the actual MFA secret (factor_value) are never returned.
 *
 * @param props - Request body and authenticated payload
 * @param props.organizationAdmin - Authenticated admin; only allowed to search
 *   their own MFA factors
 * @param props.body - Query/filter parameters for MFA factor search/listing
 * @returns Paginated MFA factor list for the requesting organizationAdmin, with
 *   sensitive fields redacted
 * @throws {Error} If filter types are invalid
 */
export async function patchhealthcarePlatformOrganizationAdminUserMfaFactors(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IHealthcarePlatformUserMfaFactor.IRequest;
}): Promise<IPageIHealthcarePlatformUserMfaFactor> {
  const { organizationAdmin, body } = props;

  // Enforce RBAC: Only allow listing MFA factors for this admin's ID
  if (
    body.user_id !== undefined &&
    body.user_id !== null &&
    body.user_id !== organizationAdmin.id
  ) {
    // If a specific user_id is requested but is not the admin's own, return empty (no error, just deny visibility)
    return {
      pagination: {
        current: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
        limit: 50 as number & tags.Type<"int32"> & tags.Minimum<0>,
        records: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
        pages: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
      },
      data: [],
    };
  }

  // Pagination defaults; 1-indexed
  const pageUnbranded = body.page ?? 1;
  const limitUnbranded = body.limit ?? 50;
  // Branding to typia types
  const page = pageUnbranded as number as number &
    tags.Type<"int32"> &
    tags.Minimum<0>;
  const limit = limitUnbranded as number as number &
    tags.Type<"int32"> &
    tags.Minimum<0>;
  const skip = (page - 1) * limit;

  // Build Prisma where condition (must NOT include undefined/null fields for required input)
  const createdAtFilter =
    body.created_at_from || body.created_at_to
      ? {
          ...(body.created_at_from !== undefined &&
            body.created_at_from !== null && {
              gte: body.created_at_from,
            }),
          ...(body.created_at_to !== undefined &&
            body.created_at_to !== null && {
              lte: body.created_at_to,
            }),
        }
      : undefined;

  const where = {
    user_id: organizationAdmin.id,
    ...(body.user_type !== undefined &&
      body.user_type !== null && {
        user_type: body.user_type,
      }),
    ...(body.factor_type !== undefined &&
      body.factor_type !== null && {
        factor_type: body.factor_type,
      }),
    ...(body.is_active !== undefined &&
      body.is_active !== null && {
        is_active: body.is_active,
      }),
    ...(createdAtFilter !== undefined && { created_at: createdAtFilter }),
  };

  // Default sorting: by created_at desc, optional sort override
  // (no mode: 'insensitive' since it's not supported SQLite)
  const orderBy = (() => {
    if (body.sort && typeof body.sort === "string") {
      // Split sort param, e.g., "created_at:desc" (no validation here; will error if field invalid)
      const [field, dir] = body.sort.split(":");
      // Only allow whitelisted sort fields; block factor_value and any unsafe
      const allowedSorts = [
        "created_at",
        "updated_at",
        "priority",
        "factor_type",
        "user_type",
        "is_active",
      ];
      if (allowedSorts.includes(field)) {
        // Direction must be "asc" or "desc"
        return {
          [field]: dir === "asc" ? "asc" : "desc",
        };
      }
    }
    // Default
    return { created_at: "desc" };
  })();

  // Query paginated results in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_user_mfa_factors.findMany({
      where,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.healthcare_platform_user_mfa_factors.count({ where }),
  ]);

  // Map DB rows to DTO; never return factor_value. Brand date/datetime fields.
  const data = rows.map((row) => ({
    id: row.id,
    user_id: row.user_id,
    user_type: row.user_type,
    factor_type: row.factor_type,
    priority: row.priority,
    is_active: row.is_active,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
  }));

  const pages = Math.ceil(total / limit);

  return {
    pagination: {
      current: page,
      limit,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: pages as number & tags.Type<"int32"> & tags.Minimum<0>,
    },
    data,
  };
}
