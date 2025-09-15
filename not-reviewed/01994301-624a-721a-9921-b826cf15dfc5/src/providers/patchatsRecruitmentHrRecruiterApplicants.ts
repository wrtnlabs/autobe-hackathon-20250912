import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentApplicant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicant";
import { IPageIAtsRecruitmentApplicant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentApplicant";
import { HrrecruiterPayload } from "../decorators/payload/HrrecruiterPayload";

/**
 * Search and retrieve a paginated, filtered list of applicant accounts.
 *
 * This operation allows HR recruiters to search applicants in the ATS system
 * with advanced filters. It supports partial search on applicant name, email,
 * or phone number; filtering by activation state; and paginates responses via
 * page/limit controls. Only non-deleted applicants are included. Results are
 * returned in summary DTO form (id, email, name, is_active) for compliance.
 *
 * @param props - Object containing the hrRecruiter payload and request body.
 * @param props.hrRecruiter - The authenticated HR recruiter (authorization
 *   decorator required).
 * @param props.body - Search and pagination input
 *   ({@link IAtsRecruitmentApplicant.IRequest})
 * @returns Paginated list of applicant summaries and page info.
 * @throws Error Malformed query or system error.
 */
export async function patchatsRecruitmentHrRecruiterApplicants(props: {
  hrRecruiter: HrrecruiterPayload;
  body: IAtsRecruitmentApplicant.IRequest;
}): Promise<IPageIAtsRecruitmentApplicant.ISummary> {
  const { body } = props;

  // Pagination/defaults
  const page: number =
    body.page !== undefined && Number(body.page) >= 1 ? Number(body.page) : 1;
  const baseLimit: number =
    body.limit !== undefined && Number(body.limit) >= 1
      ? Number(body.limit)
      : 20;
  const limit: number = baseLimit > 100 ? 100 : baseLimit;
  const skip: number = (page - 1) * limit;

  // WHERE clause
  const where: Record<string, unknown> = { deleted_at: null };
  if (body.is_active !== undefined) {
    where.is_active = body.is_active;
  }
  if (body.search && body.search.length > 0) {
    where.OR = [
      { name: { contains: body.search } },
      { email: { contains: body.search } },
      { phone: { contains: body.search } },
    ];
  }

  // Query in parallel (for count and page slice)
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ats_recruitment_applicants.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        is_active: true,
      },
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.ats_recruitment_applicants.count({ where }),
  ]);

  // Compose pagination structure; align with IPageIAtsRecruitmentApplicant.ISummary requirements
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map((row) => ({
      id: row.id,
      email: row.email,
      name: row.name,
      is_active: row.is_active,
    })),
  };
}
