import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformUserLicenseVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformUserLicenseVerification";
import { IPageIHealthcarePlatformUserLicenseVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformUserLicenseVerification";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Search and retrieve a paginated list of professional user license
 * verifications.
 *
 * Retrieves a paginated, filtered list of license verification records for
 * users in the healthcarePlatform. Supports filtering by user, user_type
 * (medicaldoctor/nurse/technician), license status, license type, and
 * verification dates. Only system admins may access this endpoint.
 *
 * @param props - The API request properties.
 * @param props.systemAdmin - The authenticated SystemadminPayload (must be
 *   present, authorization handled by controller/decorator).
 * @param props.body - Filter and pagination criteria as per
 *   IHealthcarePlatformUserLicenseVerification.IRequest.
 * @returns The paginated result set of license verification records with
 *   summary fields only.
 * @throws {Error} If a database error occurs or business rule is violated (rare
 *   as this operation is read-only and access is pre-checked).
 */
export async function patchhealthcarePlatformSystemAdminUserLicenseVerifications(props: {
  systemAdmin: SystemadminPayload;
  body: IHealthcarePlatformUserLicenseVerification.IRequest;
}): Promise<IPageIHealthcarePlatformUserLicenseVerification.ISummary> {
  const { body } = props;
  // Pagination (default to 1/20, enforce min)
  const page = body.page !== undefined && body.page > 0 ? body.page : 1;
  const page_size =
    body.page_size !== undefined && body.page_size > 0 ? body.page_size : 20;
  const skip = (page - 1) * page_size;
  const take = page_size;

  // Build where clause
  const where = {
    deleted_at: null,
    ...(body.user_id !== undefined && body.user_id !== null
      ? { user_id: body.user_id }
      : {}),
    ...(body.user_type !== undefined && body.user_type !== null
      ? { user_type: body.user_type }
      : {}),
    ...(body.license_number !== undefined && body.license_number !== null
      ? { license_number: body.license_number }
      : {}),
    ...(body.license_type !== undefined && body.license_type !== null
      ? { license_type: body.license_type }
      : {}),
    ...(body.verification_status !== undefined &&
    body.verification_status !== null
      ? { verification_status: body.verification_status }
      : {}),
    ...((body.last_verified_at_start !== undefined &&
      body.last_verified_at_start !== null) ||
    (body.last_verified_at_end !== undefined &&
      body.last_verified_at_end !== null)
      ? {
          last_verified_at: {
            ...(body.last_verified_at_start !== undefined &&
            body.last_verified_at_start !== null
              ? { gte: body.last_verified_at_start }
              : {}),
            ...(body.last_verified_at_end !== undefined &&
            body.last_verified_at_end !== null
              ? { lte: body.last_verified_at_end }
              : {}),
          },
        }
      : {}),
    ...(body.organization_id !== undefined && body.organization_id !== null
      ? { organization_id: body.organization_id }
      : {}), // left here for completeness, but schema does NOT have this field. Omit for actual query
  };
  // Remove organization_id from where because table does not have it
  delete (where as Record<string, unknown>)["organization_id"];

  // Prepare sorting
  const orderBy = {
    last_verified_at: body.sort_order === "asc" ? "asc" : "desc",
  };

  // Fetch data and count
  const [rows, count] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_user_license_verifications.findMany({
      where,
      orderBy,
      skip,
      take,
      select: {
        id: true,
        user_id: true,
        user_type: true,
        license_number: true,
        license_type: true,
        verification_status: true,
        last_verified_at: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.healthcare_platform_user_license_verifications.count({
      where,
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(page_size),
      records: count,
      pages: Math.ceil(count / page_size),
    },
    data: rows.map((row) => ({
      id: row.id,
      user_id: row.user_id,
      user_type: row.user_type,
      license_number: row.license_number,
      license_type: row.license_type,
      verification_status: row.verification_status,
      last_verified_at: toISOStringSafe(row.last_verified_at),
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
    })),
  };
}
