import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformUserCredential } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformUserCredential";
import { IPageIHealthcarePlatformUserCredential } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformUserCredential";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Search and paginate archived user credential records in the
 * healthcare_platform_user_credentials table.
 *
 * This operation retrieves a filtered and paginated list of credential history
 * records (excluding credential_hash) for audit and compliance purposes.
 * Accessible only to authorized system administrators, it allows filtering by
 * user, type, and archival/creation dates, and safely paginates the results.
 *
 * Security: credential_hash is never returned. Unauthorized access is denied.
 * Designed for compliance with HIPAA, SOC 2, and platform audit standards.
 *
 * @param props - Parameters for credential query
 * @param props.systemAdmin - The authenticated SystemadminPayload performing
 *   the query (must be of type "systemAdmin")
 * @param props.body - Search filters and pagination options for the query
 * @returns A paginated summary of archived user credentials matching the query
 * @throws {Error} If the user is unauthorized
 */
export async function patchhealthcarePlatformSystemAdminUserCredentials(props: {
  systemAdmin: SystemadminPayload;
  body: IHealthcarePlatformUserCredential.IRequest;
}): Promise<IPageIHealthcarePlatformUserCredential.ISummary> {
  const { systemAdmin, body } = props;

  // Strict authorization: Only allow systemAdmin users
  if (!systemAdmin || systemAdmin.type !== "systemAdmin") {
    throw new Error(
      "Unauthorized: Only system administrators may query credential archives.",
    );
  }

  // Pagination (defaults)
  const page = body.page ?? 1;
  const pageSize = body.pageSize ?? 20;
  const skip = (page - 1) * pageSize;
  const take = pageSize;

  // Build where clause
  const where = {
    ...(body.user_id !== undefined && body.user_id !== null
      ? { user_id: body.user_id }
      : {}),
    ...(body.user_type !== undefined && body.user_type !== null
      ? { user_type: body.user_type }
      : {}),
    ...(body.credential_type !== undefined && body.credential_type !== null
      ? { credential_type: body.credential_type }
      : {}),
    ...((body.archived_at_from !== undefined &&
      body.archived_at_from !== null) ||
    (body.archived_at_to !== undefined && body.archived_at_to !== null)
      ? {
          archived_at: {
            ...(body.archived_at_from !== undefined &&
            body.archived_at_from !== null
              ? { gte: body.archived_at_from }
              : {}),
            ...(body.archived_at_to !== undefined &&
            body.archived_at_to !== null
              ? { lte: body.archived_at_to }
              : {}),
          },
        }
      : {}),
    ...((body.created_at_from !== undefined && body.created_at_from !== null) ||
    (body.created_at_to !== undefined && body.created_at_to !== null)
      ? {
          created_at: {
            ...(body.created_at_from !== undefined &&
            body.created_at_from !== null
              ? { gte: body.created_at_from }
              : {}),
            ...(body.created_at_to !== undefined && body.created_at_to !== null
              ? { lte: body.created_at_to }
              : {}),
          },
        }
      : {}),
  };

  // Query database for page + total count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_user_credentials.findMany({
      where,
      skip,
      take,
      orderBy: { archived_at: "desc" },
      select: {
        id: true,
        user_id: true,
        user_type: true,
        credential_type: true,
        archived_at: true,
        created_at: true,
        // credential_hash NEVER SELECTED
      },
    }),
    MyGlobal.prisma.healthcare_platform_user_credentials.count({ where }),
  ]);

  // Map results to ISummary, converting all date fields to string & tags.Format<'date-time'>
  const data = rows.map((row) => ({
    id: row.id,
    user_id: row.user_id,
    user_type: row.user_type,
    credential_type: row.credential_type,
    archived_at: toISOStringSafe(row.archived_at),
    created_at: toISOStringSafe(row.created_at),
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(pageSize),
      records: total,
      pages: Math.ceil(total / pageSize),
    },
    data,
  };
}
