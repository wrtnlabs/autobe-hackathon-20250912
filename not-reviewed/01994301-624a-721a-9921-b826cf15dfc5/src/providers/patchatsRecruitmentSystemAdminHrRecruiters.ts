import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import { IPageIAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentHrRecruiter";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Search and list ats_recruitment_hrrecruiters with advanced filtering (admin
 * roles only).
 *
 * This operation returns a paginated, filterable list of all HR recruiter
 * (ats_recruitment_hrrecruiters) accounts in the system. Admins can filter by
 * partial name, department, email, account status, and creation time via
 * request body. Pagination is supported and enforced for large result sets.
 * Only admin roles are permitted. Returns only authorized summary fields.
 *
 * @param props - Request object containing authenticated system admin and
 *   filter/search body
 * @param props.systemAdmin - JWT-authenticated system admin performing the
 *   query
 * @param props.body - Filtering and pagination request options
 * @returns Paginated list of HR recruiter summaries matching the filter
 * @throws {Error} If filters are malformed or unauthorized
 */
export async function patchatsRecruitmentSystemAdminHrRecruiters(props: {
  systemAdmin: SystemadminPayload;
  body: IAtsRecruitmentHrRecruiter.IRequest;
}): Promise<IPageIAtsRecruitmentHrRecruiter.ISummary> {
  const { body } = props;

  // Normalize and validate pagination
  const page: number = body.page && body.page > 0 ? Number(body.page) : 1;
  const limit: number = body.limit && body.limit > 0 ? Number(body.limit) : 20;
  const skip = (page - 1) * limit;

  // Filtering construction
  const where = {
    ...(typeof body.is_active === "boolean"
      ? { is_active: body.is_active }
      : {}),
    ...(body.department !== undefined &&
      body.department !== null && { department: body.department }),
    ...(body.created_at_from !== undefined && body.created_at_from !== null
      ? { created_at: { gte: body.created_at_from } }
      : {}),
    ...(body.created_at_to !== undefined && body.created_at_to !== null
      ? {
          created_at: Object.assign(
            {},
            body.created_at_from !== undefined && body.created_at_from !== null
              ? { gte: body.created_at_from }
              : {},
            { lte: body.created_at_to },
          ),
        }
      : {}),
    ...(body.search !== undefined &&
    body.search !== null &&
    body.search.length > 0
      ? {
          OR: [
            { name: { contains: body.search } },
            { email: { contains: body.search } },
            { department: { contains: body.search } },
          ],
        }
      : {}),
  };

  const [total, recruiters] = await Promise.all([
    MyGlobal.prisma.ats_recruitment_hrrecruiters.count({ where }),
    MyGlobal.prisma.ats_recruitment_hrrecruiters.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        email: true,
        name: true,
        department: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    }),
  ]);

  // Map recruiters to summary structure and convert date types
  const data = recruiters.map((recruiter) => {
    return {
      id: recruiter.id,
      email: recruiter.email,
      name: recruiter.name,
      department:
        recruiter.department === undefined ? undefined : recruiter.department,
      is_active: recruiter.is_active,
      created_at: toISOStringSafe(recruiter.created_at),
      updated_at: toISOStringSafe(recruiter.updated_at),
      deleted_at:
        recruiter.deleted_at === null || recruiter.deleted_at === undefined
          ? undefined
          : toISOStringSafe(recruiter.deleted_at),
    };
  });

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Number(limit) > 0 ? Math.ceil(Number(total) / Number(limit)) : 0,
    },
    data,
  };
}
