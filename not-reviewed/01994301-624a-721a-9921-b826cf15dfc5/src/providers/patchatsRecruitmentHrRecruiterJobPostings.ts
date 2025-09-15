import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentJobPosting } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobPosting";
import { IPageIAtsRecruitmentJobPosting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentJobPosting";
import { HrrecruiterPayload } from "../decorators/payload/HrrecruiterPayload";

/**
 * List, filter, and paginate job postings (ats_recruitment_job_postings).
 *
 * Returns a paginated, filtered list of job posting summaries from the
 * ats_recruitment_job_postings table as used by privileged HR recruiters and
 * system admins. Enables robust search, filtering, and sorting for business
 * management, monitoring, and reporting use cases.
 *
 * Only includes active (not soft-deleted) postings. Supports advanced filter
 * criteria (recruiter, type, state, visibility, title/description/loc search,
 * created/application_deadline ranges), robust pagination, and sorting by
 * allowed fields.
 *
 * @param props - Props for the endpoint.
 * @param props.hrRecruiter - The authenticated HR recruiter making the request.
 * @param props.body - Filter/search parameters and pagination options.
 * @returns A paginated, filtered summary collection of job postings.
 * @throws {Error} If the operation fails.
 */
export async function patchatsRecruitmentHrRecruiterJobPostings(props: {
  hrRecruiter: HrrecruiterPayload;
  body: IAtsRecruitmentJobPosting.IRequest;
}): Promise<IPageIAtsRecruitmentJobPosting.ISummary> {
  const { body } = props;

  // Pagination parameters (default fallback)
  const page = typeof body.page === "number" && body.page > 0 ? body.page : 1;
  const limit =
    typeof body.limit === "number" && body.limit > 0 ? body.limit : 20;
  const skip = (page - 1) * limit;

  // Allowed sortable fields (enforced)
  const sortableFields = ["created_at", "title", "application_deadline"];
  const sortField =
    typeof body.sort === "string" && sortableFields.includes(body.sort)
      ? body.sort
      : "created_at";
  const sortOrder = body.order === "asc" ? "asc" : "desc";

  // WHERE clause construction (only add filters where present; handle undefined/null)
  const where = {
    deleted_at: null,
    ...(body.hr_recruiter_id !== undefined &&
      body.hr_recruiter_id !== null && {
        hr_recruiter_id: body.hr_recruiter_id,
      }),
    ...(body.job_employment_type_id !== undefined &&
      body.job_employment_type_id !== null && {
        job_employment_type_id: body.job_employment_type_id,
      }),
    ...(body.job_posting_state_id !== undefined &&
      body.job_posting_state_id !== null && {
        job_posting_state_id: body.job_posting_state_id,
      }),
    ...(body.title !== undefined &&
      body.title !== null &&
      body.title.length > 0 && { title: { contains: body.title } }),
    ...(body.description !== undefined &&
      body.description !== null &&
      body.description.length > 0 && {
        description: { contains: body.description },
      }),
    ...(body.location !== undefined &&
      body.location !== null &&
      body.location.length > 0 && { location: { contains: body.location } }),
    ...(body.is_visible !== undefined &&
      body.is_visible !== null && { is_visible: body.is_visible }),
    ...((body.date_from !== undefined && body.date_from !== null) ||
    (body.date_to !== undefined && body.date_to !== null)
      ? {
          created_at: {
            ...(body.date_from !== undefined &&
              body.date_from !== null && { gte: body.date_from }),
            ...(body.date_to !== undefined &&
              body.date_to !== null && { lte: body.date_to }),
          },
        }
      : {}),
    ...((body.application_deadline_from !== undefined &&
      body.application_deadline_from !== null) ||
    (body.application_deadline_to !== undefined &&
      body.application_deadline_to !== null)
      ? {
          application_deadline: {
            ...(body.application_deadline_from !== undefined &&
              body.application_deadline_from !== null && {
                gte: body.application_deadline_from,
              }),
            ...(body.application_deadline_to !== undefined &&
              body.application_deadline_to !== null && {
                lte: body.application_deadline_to,
              }),
          },
        }
      : {}),
  };

  // Fetch paginated results & total count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ats_recruitment_job_postings.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip,
      take: limit,
      select: {
        id: true,
        title: true,
        job_posting_state_id: true,
        job_employment_type_id: true,
        location: true,
        application_deadline: true,
        is_visible: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.ats_recruitment_job_postings.count({ where }),
  ]);

  // Map results to ISummary DTO (with all date fields to string & tags.Format<'date-time'>)
  const data = rows.map((row) => ({
    id: row.id,
    title: row.title,
    job_posting_state_id: row.job_posting_state_id,
    job_employment_type_id: row.job_employment_type_id,
    location: row.location ?? null,
    application_deadline:
      row.application_deadline != null
        ? toISOStringSafe(row.application_deadline)
        : null,
    is_visible: row.is_visible,
    created_at: toISOStringSafe(row.created_at),
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data,
  };
}
