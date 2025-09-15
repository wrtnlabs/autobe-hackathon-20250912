import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentApplication } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplication";
import { IPageIAtsRecruitmentApplication } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentApplication";
import { HrrecruiterPayload } from "../decorators/payload/HrrecruiterPayload";

/**
 * Retrieve a filtered and paginated list of job applications
 * (ats_recruitment_applications table).
 *
 * This operation allows authenticated HR recruiters to retrieve a paginated
 * list of job application summaries from the ATS system with advanced search,
 * sorting, and filtering capabilities. Supported filters include applicant, job
 * posting, application status, date range, and free-text searching of the
 * status field. The response provides a structured table of results with
 * pagination.
 *
 * @param props - Input properties
 * @param props.hrRecruiter - The authenticated HR recruiter making the request
 * @param props.body - Search and filter parameters for applications
 * @returns Paginated summary list of job applications matching the specified
 *   filters
 * @throws {Error} If database query fails or invalid sort field is used
 */
export async function patchatsRecruitmentHrRecruiterApplications(props: {
  hrRecruiter: HrrecruiterPayload;
  body: IAtsRecruitmentApplication.IRequest;
}): Promise<IPageIAtsRecruitmentApplication.ISummary> {
  const { body } = props;
  const defaultPage = 1;
  const defaultLimit = 20;
  const rawPage = body.page ?? defaultPage;
  const rawLimit = body.limit ?? defaultLimit;
  // Remove typia/tag branding for page calculation to get raw numbers
  const page = Number(rawPage);
  const limit = Number(rawLimit);

  // Parse sort field & direction (allow prefix +/- to specify order)
  let sortBy = "submitted_at";
  let sortDirection: "asc" | "desc" = "desc";
  if (
    body.sort !== undefined &&
    typeof body.sort === "string" &&
    body.sort.length > 0
  ) {
    // Accept +field for asc, -field for desc, fallback to submitted_at
    if (body.sort.startsWith("-")) {
      sortBy = body.sort.slice(1);
      sortDirection = "desc";
    } else if (body.sort.startsWith("+")) {
      sortBy = body.sort.slice(1);
      sortDirection = "asc";
    } else {
      sortBy = body.sort;
      sortDirection = "asc";
    }
    // Only allow sortable fields
    if (sortBy !== "current_status" && sortBy !== "submitted_at") {
      sortBy = "submitted_at";
      sortDirection = "desc";
    }
  }

  // Build date range filter for submitted_at
  const submittedAtFilter =
    body.submitted_at_from !== undefined && body.submitted_at_to !== undefined
      ? {
          gte: body.submitted_at_from,
          lte: body.submitted_at_to,
        }
      : body.submitted_at_from !== undefined
        ? {
            gte: body.submitted_at_from,
          }
        : body.submitted_at_to !== undefined
          ? {
              lte: body.submitted_at_to,
            }
          : undefined;

  // Build where filter
  const where = {
    deleted_at: null,
    ...(body.applicant_id !== undefined &&
      body.applicant_id !== null && {
        applicant_id: body.applicant_id,
      }),
    ...(body.job_posting_id !== undefined &&
      body.job_posting_id !== null && {
        job_posting_id: body.job_posting_id,
      }),
    ...(body.status !== undefined &&
      body.status !== null && {
        current_status: body.status,
      }),
    ...(submittedAtFilter !== undefined && { submitted_at: submittedAtFilter }),
    ...(body.search !== undefined &&
      typeof body.search === "string" &&
      body.search.length > 0 && {
        OR: [{ current_status: { contains: body.search } }],
      }),
  };

  // Query DB in parallel: findMany for rows, count for total
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ats_recruitment_applications.findMany({
      where,
      orderBy: { [sortBy]: sortDirection },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        applicant_id: true,
        job_posting_id: true,
        current_status: true,
        submitted_at: true,
      },
    }),
    MyGlobal.prisma.ats_recruitment_applications.count({ where }),
  ]);

  return {
    pagination: {
      current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
    data: rows.map((row) => ({
      id: row.id,
      applicant_id: row.applicant_id,
      job_posting_id: row.job_posting_id,
      current_status: row.current_status,
      submitted_at: toISOStringSafe(row.submitted_at),
    })),
  };
}
