import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemSetting";
import { IPageIAtsRecruitmentSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentSystemSetting";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Search and retrieve a paginated, filtered list of system settings
 * (ats_recruitment_system_settings).
 *
 * This operation enables system administrators to search, filter, and paginate
 * through all configuration settings in the ATS platform. Advanced filtering is
 * available by name, type, search term, and soft delete status. All date fields
 * are returned as ISO8601 strings, and pagination is consistent with the IPage
 * standard. Only system administrators may access this endpoint.
 *
 * @param props - The request properties
 * @param props.systemAdmin - The authenticated system administrator
 *   (SystemadminPayload) making the request
 * @param props.body - The search, pagination, and filter parameters for
 *   querying system settings
 * @returns A paginated result containing matching system setting records and
 *   full pagination metadata
 * @throws {Error} If the request is unauthorized or if a database error occurs
 */
export async function patchatsRecruitmentSystemAdminSystemSettings(props: {
  systemAdmin: SystemadminPayload;
  body: IAtsRecruitmentSystemSetting.IRequest;
}): Promise<IPageIAtsRecruitmentSystemSetting> {
  const { body } = props;

  // Default and normalize pagination params
  const page: number = body.page && body.page > 0 ? Number(body.page) : 1;
  const limit: number = body.limit && body.limit > 0 ? Number(body.limit) : 100;
  const skip: number = (page - 1) * limit;

  // Sort handling - restrict to known fields
  const ALLOWED_SORT_FIELDS = ["setting_name", "created_at", "updated_at"];
  let orderByField = "created_at";
  let orderByDir: "asc" | "desc" = "desc";
  if (typeof body.sort === "string") {
    const [field, dir] = body.sort.split(":");
    if (
      !!field &&
      ALLOWED_SORT_FIELDS.includes(field) &&
      (dir === "asc" || dir === "desc")
    ) {
      orderByField = field;
      orderByDir = dir;
    }
  }

  // Build where clause, omitting undefineds
  const where = {
    ...(body.setting_name !== undefined &&
      body.setting_name !== null && { setting_name: body.setting_name }),
    ...(body.setting_type !== undefined &&
      body.setting_type !== null && { setting_type: body.setting_type }),
    ...(body.is_deleted === true && { deleted_at: { not: null } }),
    ...(body.is_deleted === false && { deleted_at: null }),
    ...(typeof body.search === "string" &&
      body.search.length > 0 && {
        OR: [
          { setting_name: { contains: body.search } },
          { setting_value: { contains: body.search } },
          { setting_type: { contains: body.search } },
          { description: { contains: body.search } },
        ],
      }),
  };

  // Get data and count concurrently
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ats_recruitment_system_settings.findMany({
      where,
      orderBy: { [orderByField]: orderByDir },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.ats_recruitment_system_settings.count({ where }),
  ]);

  // Format all fields as per DTO, with proper null/undefined and ISO date
  const data = rows.map((row) => ({
    id: row.id,
    setting_name: row.setting_name,
    setting_value: row.setting_value,
    setting_type: row.setting_type,
    description: row.description ?? undefined,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    deleted_at:
      row.deleted_at !== null && row.deleted_at !== undefined
        ? toISOStringSafe(row.deleted_at)
        : undefined,
  }));

  // Compute safe pagination
  const pages = Math.ceil((total > 0 ? total : 1) / limit);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Number(pages),
    },
    data,
  };
}
