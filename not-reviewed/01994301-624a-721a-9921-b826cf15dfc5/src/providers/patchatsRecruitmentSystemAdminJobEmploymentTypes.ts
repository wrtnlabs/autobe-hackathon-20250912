import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentJobEmploymentType } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobEmploymentType";
import { IPageIAtsRecruitmentJobEmploymentType } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentJobEmploymentType";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Retrieve a filtered, paginated list of job employment types
 * (ats_recruitment_job_employment_types).
 *
 * This endpoint allows authorized system administrators to retrieve and search
 * job employment types used in ATS job postings. Filtering options include
 * status, partial text match, and date ranges. Data is paged and supports
 * default sorting by creation date.
 *
 * Only non-soft-deleted records are returned. Each record is mapped to API
 * structure with correct date string handling. Authentication is strictly
 * required via SystemadminPayload.
 *
 * @param props - Request properties including systemAdmin authentication and
 *   filter body
 * @param props.systemAdmin - Authenticated system administrator payload
 * @param props.body - Filter, sort, and pagination parameters for the
 *   employment types list
 * @returns Paginated list of job employment types matching the filter criteria
 * @throws {Error} If authorization fails or database query encounters an error
 */
export async function patchatsRecruitmentSystemAdminJobEmploymentTypes(props: {
  systemAdmin: SystemadminPayload;
  body: IAtsRecruitmentJobEmploymentType.IRequest;
}): Promise<IPageIAtsRecruitmentJobEmploymentType> {
  const { body } = props;
  // Pagination
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Ordering
  const allowedOrderFields = ["name", "created_at", "updated_at"];
  const rawOrderField = body.order_by;
  const orderField =
    rawOrderField && allowedOrderFields.includes(rawOrderField)
      ? rawOrderField
      : "created_at";
  const orderDirection = body.order_dir === "asc" ? "asc" : "desc";

  // Filtering
  // Build where condition immutably
  const where = {
    deleted_at: null,
    ...(typeof body.is_active === "boolean" && { is_active: body.is_active }),
    ...((body.created_from || body.created_to) && {
      created_at: {
        ...(body.created_from && { gte: body.created_from }),
        ...(body.created_to && { lte: body.created_to }),
      },
    }),
    ...((body.updated_from || body.updated_to) && {
      updated_at: {
        ...(body.updated_from && { gte: body.updated_from }),
        ...(body.updated_to && { lte: body.updated_to }),
      },
    }),
    ...(body.search && {
      OR: [
        { name: { contains: body.search } },
        { description: { contains: body.search } },
      ],
    }),
  };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ats_recruitment_job_employment_types.findMany({
      where,
      orderBy: { [orderField]: orderDirection },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.ats_recruitment_job_employment_types.count({ where }),
  ]);

  // Map db rows to API type, convert dates (no native Date type used).
  const data = rows.map((row) => ({
    id: row.id,
    name: row.name,
    description:
      row.description !== undefined && row.description !== null
        ? row.description
        : null,
    is_active: row.is_active,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    deleted_at:
      row.deleted_at !== undefined && row.deleted_at !== null
        ? toISOStringSafe(row.deleted_at)
        : null,
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: limit > 0 ? Math.ceil(total / limit) : 1,
    },
    data,
  };
}
