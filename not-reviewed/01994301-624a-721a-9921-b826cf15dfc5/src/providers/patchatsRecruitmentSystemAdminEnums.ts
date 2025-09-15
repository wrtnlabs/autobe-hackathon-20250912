import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentEnum } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentEnum";
import { IPageIAtsRecruitmentEnum } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentEnum";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Search paginated enums (ats_recruitment_enums table) for admin/reference use.
 *
 * This endpoint allows systemAdmin users to search, filter, and page through
 * enumeration values that are defined in the ats_recruitment_enums table,—which
 * standardizes various codes, labels, categories (enum_type), and their usage
 * for the ATS. The search supports filtering by enum_type, code, label,
 * description, as well as text search, custom sort, and pagination. Only
 * systemAdmin role may use.
 *
 * @param props - Function arguments
 * @param props.systemAdmin - The authenticated system admin user
 *   (SystemadminPayload)
 * @param props.body - Search and pagination parameters for querying enums
 *   (IAtsRecruitmentEnum.IRequest)
 * @returns Paginated list of enum summaries matching the query
 *   (IPageIAtsRecruitmentEnum.ISummary)
 * @throws {Error} If pagination arguments are invalid
 */
export async function patchatsRecruitmentSystemAdminEnums(props: {
  systemAdmin: SystemadminPayload;
  body: IAtsRecruitmentEnum.IRequest;
}): Promise<IPageIAtsRecruitmentEnum.ISummary> {
  const { body } = props;

  // Allowed sort fields
  const allowedSortBy = ["created_at", "enum_type", "enum_code", "label"];
  // Compose WHERE clause (excluding undefined/null for non-nullable fields)
  const where = {
    ...(body.enum_type !== undefined &&
      body.enum_type !== null && { enum_type: body.enum_type }),
    ...(body.enum_code !== undefined &&
      body.enum_code !== null && { enum_code: body.enum_code }),
    ...(body.label !== undefined &&
      body.label !== null && { label: { contains: body.label } }),
    ...(body.description !== undefined &&
      body.description !== null && {
        description: { contains: body.description },
      }),
    ...(body.is_deleted === true ? { deleted_at: { not: null } } : {}),
    ...(body.is_deleted === false ? { deleted_at: null } : {}),
    ...(body.search && body.search.length > 0
      ? {
          OR: [
            { label: { contains: body.search } },
            { enum_code: { contains: body.search } },
            { description: { contains: body.search } },
          ],
        }
      : {}),
  };

  // Handle pagination: page, limit. Default page 1, limit 20; min 1.
  // Math.max(1, ...) to avoid invalid zero/negative paging.
  const pageValue = body.page ?? 1;
  const limitValue = body.limit ?? 20;
  const page = pageValue < 1 ? 1 : pageValue;
  const limit = limitValue < 1 ? 1 : limitValue;
  const skip = (page - 1) * limit;

  // Sort: Only whitelistable fields; default to created_at desc
  const sortBy =
    body.sortBy && allowedSortBy.includes(body.sortBy)
      ? body.sortBy
      : "created_at";
  const sortOrder = body.sortOrder === "asc" ? "asc" : "desc";

  // Query results + total count for pagination (never create intermediate objects for Prisma)
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ats_recruitment_enums.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
      select: {
        id: true,
        enum_type: true,
        enum_code: true,
        label: true,
        description: true,
        deleted_at: true,
      },
    }),
    MyGlobal.prisma.ats_recruitment_enums.count({ where }),
  ]);

  // Map database to API response: match branding for id, dates, and optionals
  const data: IAtsRecruitmentEnum.ISummary[] = rows.map((item) => {
    // id is uuid string, description and deleted_at are nullable/optional
    return {
      id: item.id,
      enum_type: item.enum_type,
      enum_code: item.enum_code,
      label: item.label,
      ...(item.description !== undefined &&
        item.description !== null && {
          description: item.description,
        }),
      ...(item.deleted_at !== undefined &&
        item.deleted_at !== null && {
          deleted_at: toISOStringSafe(item.deleted_at),
        }),
    };
  });

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data,
  };
}
