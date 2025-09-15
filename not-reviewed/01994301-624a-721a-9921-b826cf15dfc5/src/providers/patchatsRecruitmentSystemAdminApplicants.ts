import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentApplicant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicant";
import { IPageIAtsRecruitmentApplicant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentApplicant";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Search and retrieve a paginated, filtered list of applicant accounts.
 *
 * This function provides search, filtering, and pagination over the applicant
 * accounts in the ATS recruitment system. Only summary-level (non-sensitive)
 * applicant information is returned. This operation is restricted to system
 * administrators for compliance and workforce management use cases, and omits
 * soft-deleted records.
 *
 * Filters are applied for activation status (is_active) and partial,
 * case-sensitive search across name, email, and phone fields. Results include
 * paged meta (current, limit, records, pages). SQL is portable: no
 * Postgres-specific string modes or incompatible features are used.
 *
 * @param props - Request containing:
 *
 *   - SystemAdmin: authenticated SystemadminPayload confirming privileged access
 *   - Body: IAtsRecruitmentApplicant.IRequest
 *
 *       - Page?: page number (default 1; min 1)
 *       - Limit?: number of results per page (default 20; max 100)
 *       - Search?: partial text search (applies to name, email, or phone)
 *       - Is_active?: filter for account activation
 *
 * @returns IPageIAtsRecruitmentApplicant.ISummary containing list and
 *   pagination meta
 * @throws {Error} If any system error occurs while fetching data
 */
export async function patchatsRecruitmentSystemAdminApplicants(props: {
  systemAdmin: SystemadminPayload;
  body: IAtsRecruitmentApplicant.IRequest;
}): Promise<IPageIAtsRecruitmentApplicant.ISummary> {
  const { body } = props;

  // Guard: only an authenticated system admin can use this endpoint
  // Authorization must already be performed by controller/decorator but enforced by contract
  // Soft delete: only include records with deleted_at === null

  // Pagination parameters
  const pageNum =
    typeof body.page === "number" && Number.isFinite(body.page) && body.page > 0
      ? body.page
      : 1;
  const limitNum =
    typeof body.limit === "number" &&
    Number.isFinite(body.limit) &&
    body.limit > 0
      ? Math.min(body.limit, 100)
      : 20;
  const skip = (pageNum - 1) * limitNum;

  // Where filter construction
  const filters: Record<string, unknown> = {
    deleted_at: null,
  };
  if (typeof body.is_active === "boolean") filters.is_active = body.is_active;

  if (typeof body.search === "string" && body.search.length > 0) {
    filters.OR = [
      { name: { contains: body.search } },
      { email: { contains: body.search } },
      { phone: { contains: body.search } },
    ];
  }

  // Fetch paged rows and total count concurrently
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ats_recruitment_applicants.findMany({
      where: filters,
      orderBy: { created_at: "desc" },
      skip,
      take: limitNum,
      select: {
        id: true,
        email: true,
        name: true,
        is_active: true,
      },
    }),
    MyGlobal.prisma.ats_recruitment_applicants.count({ where: filters }),
  ]);

  // Transform rows to IAtsRecruitmentApplicant.ISummary
  const summaries = rows.map(
    (row): IAtsRecruitmentApplicant.ISummary => ({
      id: row.id,
      email: row.email,
      name: row.name,
      is_active: row.is_active,
    }),
  );

  return {
    pagination: {
      current: Number(pageNum),
      limit: Number(limitNum),
      records: total,
      pages: Math.ceil(total / limitNum),
    },
    data: summaries,
  };
}
