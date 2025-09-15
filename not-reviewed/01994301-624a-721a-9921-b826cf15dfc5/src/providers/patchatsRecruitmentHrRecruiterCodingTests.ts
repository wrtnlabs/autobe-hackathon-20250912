import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentCodingTest } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentCodingTest";
import { IPageIAtsRecruitmentCodingTest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentCodingTest";
import { HrrecruiterPayload } from "../decorators/payload/HrrecruiterPayload";

/**
 * Retrieve paginated/searchable lists of coding tests with advanced filtering.
 *
 * This operation retrieves a paginated, filterable list of coding test
 * instances from the ats_recruitment_coding_tests table. It supports advanced
 * search, filtering, and sorting on test attributes for authorized HR
 * recruiters. HR recruiters can filter by test provider, status, scheduling
 * windows, applicant/job posting, etc., with robust pagination and sorting. The
 * response provides business-relevant test details for auditing and workflow.
 *
 * @param props - Function parameter containing:
 *
 *   - HrRecruiter: Authenticated HR recruiter context
 *   - Body: Filtering, pagination, and sorting options
 *       (IAtsRecruitmentCodingTest.IRequest)
 *
 * @returns Paginated result set of coding test summary information
 *   (IPageIAtsRecruitmentCodingTest.ISummary)
 * @throws Error on internal query errors (all filtering/sorting/paging
 *   validation handled gracefully)
 */
export async function patchatsRecruitmentHrRecruiterCodingTests(props: {
  hrRecruiter: HrrecruiterPayload;
  body: IAtsRecruitmentCodingTest.IRequest;
}): Promise<IPageIAtsRecruitmentCodingTest.ISummary> {
  const { hrRecruiter, body } = props;

  // Pagination defaults and validation
  const page = typeof body.page === "number" && body.page > 0 ? body.page : 1;
  const limit =
    typeof body.limit === "number" && body.limit > 0 ? body.limit : 20;
  const skip = (page - 1) * limit;

  // Sorting field logic (narrow allowed fields safely)
  let sortField = "scheduled_at";
  let sortOrder: "asc" | "desc" = "desc";
  if (typeof body.sort === "string" && body.sort.length > 0) {
    sortOrder = body.sort.startsWith("-") ? "desc" : "asc";
    const rawField = body.sort.replace(/^[-+]/, "");
    const allowedSorts = [
      "scheduled_at",
      "created_at",
      "status",
      "test_provider",
    ] as const;
    if ((allowedSorts as readonly string[]).includes(rawField)) {
      sortField = rawField;
    }
  }

  // Build filters, merging gte/lte only when each bound defined
  let scheduled_at_filter:
    | Record<string, string & tags.Format<"date-time">>
    | undefined;
  if (body.scheduled_from !== undefined || body.scheduled_to !== undefined) {
    scheduled_at_filter = {
      ...(body.scheduled_from !== undefined && { gte: body.scheduled_from }),
      ...(body.scheduled_to !== undefined && { lte: body.scheduled_to }),
    };
  }

  // Compose where clause
  const where: Record<string, unknown> = {
    ats_recruitment_hrrecruiter_id: hrRecruiter.id,
    ...(typeof body.test_provider === "string" &&
      body.test_provider.length > 0 && { test_provider: body.test_provider }),
    ...(typeof body.status === "string" &&
      body.status.length > 0 && { status: body.status }),
    ...(scheduled_at_filter && { scheduled_at: scheduled_at_filter }),
    ...(typeof body.applicant_id === "string" &&
      body.applicant_id.length > 0 && {
        ats_recruitment_applicant_id: body.applicant_id,
      }),
  };
  if (
    typeof body.job_posting_id === "string" &&
    body.job_posting_id.length > 0
  ) {
    where.application = { job_posting_id: body.job_posting_id };
  }

  // Query
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ats_recruitment_coding_tests.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip,
      take: limit,
      select: {
        id: true,
        ats_recruitment_application_id: true,
        ats_recruitment_applicant_id: true,
        ats_recruitment_hrrecruiter_id: true,
        test_provider: true,
        test_external_id: true,
        status: true,
        scheduled_at: true,
        expiration_at: true,
      },
    }),
    MyGlobal.prisma.ats_recruitment_coding_tests.count({ where }),
  ]);

  // Transform to ISummary
  const data = rows.map((row) => {
    // Compose ISummary, all date output as string (date-time)
    const scheduled_at: string & tags.Format<"date-time"> = toISOStringSafe(
      row.scheduled_at,
    );
    const expiration_at:
      | (string & tags.Format<"date-time">)
      | null
      | undefined =
      row.expiration_at !== undefined && row.expiration_at !== null
        ? toISOStringSafe(row.expiration_at)
        : null;
    return {
      id: row.id,
      ats_recruitment_application_id: row.ats_recruitment_application_id,
      ats_recruitment_applicant_id: row.ats_recruitment_applicant_id,
      ats_recruitment_hrrecruiter_id: row.ats_recruitment_hrrecruiter_id,
      test_provider: row.test_provider,
      test_external_id: row.test_external_id,
      status: row.status,
      scheduled_at,
      expiration_at,
    };
  });

  // Pages always a positive int
  const pages = limit > 0 ? Math.ceil(total / limit) : 1;

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages,
    },
    data,
  };
}
