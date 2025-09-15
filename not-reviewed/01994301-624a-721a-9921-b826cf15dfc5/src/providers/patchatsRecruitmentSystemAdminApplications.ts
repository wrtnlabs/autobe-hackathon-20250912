import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentApplication } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplication";
import { IPageIAtsRecruitmentApplication } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentApplication";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Retrieve a filtered and paginated list of job applications
 * (ats_recruitment_applications table).
 *
 * This endpoint allows a system administrator to search and filter job
 * application records by applicant, job posting, application status, submission
 * date ranges, and full-text status search. The results are paginated and can
 * be sorted by approved fields.
 *
 * Soft-deleted applications are hidden by default.
 *
 * @param props - The input parameters containing the authenticated admin and
 *   search/filter options
 * @param props.systemAdmin - The authenticated system administrator
 *   (authorization checked upstream)
 * @param props.body - Search, filtering and pagination options for job
 *   applications
 * @returns A paginated result object containing job applications matching the
 *   provided filters
 * @throws {Error} If an unknown sort field is provided
 */
export async function patchatsRecruitmentSystemAdminApplications(props: {
  systemAdmin: SystemadminPayload;
  body: IAtsRecruitmentApplication.IRequest;
}): Promise<IPageIAtsRecruitmentApplication.ISummary> {
  const { body } = props;

  // Defaults and tags normalization
  const page = body.page !== undefined && body.page !== null ? body.page : 1;
  const limit =
    body.limit !== undefined && body.limit !== null ? body.limit : 20;
  const skip = (page - 1) * limit;

  // Allowed sort fields
  const allowedSortFields = ["submitted_at", "current_status"] as const;
  let sortField: "submitted_at" | "current_status" = "submitted_at";
  let sortOrder: "asc" | "desc" = "desc";

  if (body.sort !== undefined && body.sort !== null && body.sort.length > 0) {
    // Accept -submitted_at, +current_status, etc.
    const isDesc = body.sort.startsWith("-");
    const isAsc = body.sort.startsWith("+");
    let cleanSort = body.sort.replace(/^[-+]/, "");
    if (
      allowedSortFields.includes(cleanSort as "submitted_at" | "current_status")
    ) {
      sortField = cleanSort as typeof sortField;
      sortOrder = isAsc ? "asc" : "desc";
    } else {
      throw new Error(
        `Sort field '${cleanSort}' is not supported. Allowed: ${allowedSortFields.join(", ")}`,
      );
    }
  }

  // Where clause assembly
  const where: Record<string, unknown> = {
    deleted_at: null,
  };
  if (body.applicant_id !== undefined && body.applicant_id !== null) {
    where.applicant_id = body.applicant_id;
  }
  if (body.job_posting_id !== undefined && body.job_posting_id !== null) {
    where.job_posting_id = body.job_posting_id;
  }
  if (body.status !== undefined && body.status !== null) {
    where.current_status = body.status;
  }
  // Full-text status search (applies only on current_status, not on uuid fields)
  if (
    body.search !== undefined &&
    body.search !== null &&
    body.search.length > 0
  ) {
    where.current_status = {
      contains: body.search,
    };
  }
  // Date range filter for submitted_at
  if (
    (body.submitted_at_from !== undefined && body.submitted_at_from !== null) ||
    (body.submitted_at_to !== undefined && body.submitted_at_to !== null)
  ) {
    where.submitted_at = {
      ...(body.submitted_at_from !== undefined &&
        body.submitted_at_from !== null && {
          gte: body.submitted_at_from,
        }),
      ...(body.submitted_at_to !== undefined &&
        body.submitted_at_to !== null && {
          lte: body.submitted_at_to,
        }),
    };
  }

  // Query and count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ats_recruitment_applications.findMany({
      where,
      orderBy: {
        [sortField]: sortOrder,
      },
      skip,
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
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map(
      (row): IAtsRecruitmentApplication.ISummary => ({
        id: row.id,
        applicant_id: row.applicant_id,
        job_posting_id: row.job_posting_id,
        current_status: row.current_status,
        submitted_at: toISOStringSafe(row.submitted_at),
      }),
    ),
  };
}
