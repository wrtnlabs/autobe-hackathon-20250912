import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentCodingTest } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentCodingTest";
import { IPageIAtsRecruitmentCodingTest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentCodingTest";
import { ApplicantPayload } from "../decorators/payload/ApplicantPayload";

/**
 * Retrieve paginated/searchable lists of coding tests with advanced filtering.
 *
 * This endpoint returns a list of coding test assignments for the authenticated
 * applicant, supporting advanced filtering (provider, status, scheduling,
 * etc.), paginated and ordered as specified. Only coding tests belonging to the
 * requesting applicant are returned. Results include all key business
 * attributes required for audit, workflow tracking, and status display.
 *
 * @param props - Object with authentication (ApplicantPayload) and
 *   filter/sort/pagination (body)
 * @param props.applicant - Authenticated applicant context
 * @param props.body - Filter/search/sort parameters (see
 *   IAtsRecruitmentCodingTest.IRequest)
 * @returns Paginated, filtered list of coding test assignment summaries
 * @throws {Error} If operation fails
 */
export async function patchatsRecruitmentApplicantCodingTests(props: {
  applicant: ApplicantPayload;
  body: IAtsRecruitmentCodingTest.IRequest;
}): Promise<IPageIAtsRecruitmentCodingTest.ISummary> {
  const { applicant, body } = props;
  // Defensive pagination normalizations
  const pageValue = body.page != null && body.page > 0 ? Number(body.page) : 1;
  const limitValue =
    body.limit != null && body.limit > 0 ? Number(body.limit) : 20;
  const skipValue = (pageValue - 1) * limitValue;

  // Build advanced where clause: only for this applicant!
  const where = {
    deleted_at: null,
    ats_recruitment_applicant_id: applicant.id,
    ...(body.test_provider !== undefined &&
      body.test_provider !== null && {
        test_provider: body.test_provider,
      }),
    ...(body.status !== undefined &&
      body.status !== null && {
        status: body.status,
      }),
    ...(((body.scheduled_from !== undefined && body.scheduled_from !== null) ||
      (body.scheduled_to !== undefined && body.scheduled_to !== null)) && {
      scheduled_at: {
        ...(body.scheduled_from !== undefined &&
          body.scheduled_from !== null && {
            gte: body.scheduled_from,
          }),
        ...(body.scheduled_to !== undefined &&
          body.scheduled_to !== null && {
            lte: body.scheduled_to,
          }),
      },
    }),
    ...(body.applicant_id !== undefined &&
      body.applicant_id !== null && {
        ats_recruitment_applicant_id: body.applicant_id,
      }),
    ...(body.job_posting_id !== undefined &&
      body.job_posting_id !== null && {
        ats_recruitment_application_id: body.job_posting_id,
      }),
  };

  // Sorting
  let sortField = "scheduled_at";
  let sortOrder: "asc" | "desc" = "desc";
  if (typeof body.sort === "string" && body.sort.length > 0) {
    const cleanSort = body.sort.replace(/\s/g, "");
    if (cleanSort.startsWith("-")) {
      sortField = cleanSort.slice(1);
      sortOrder = "desc";
    } else if (cleanSort.startsWith("+")) {
      sortField = cleanSort.slice(1);
      sortOrder = "asc";
    } else {
      sortField = cleanSort;
      sortOrder = "asc";
    }
    // Guard: Only allow sortField if it is a known column
    if (
      sortField !== "scheduled_at" &&
      sortField !== "created_at" &&
      sortField !== "status" &&
      sortField !== "test_provider"
    ) {
      sortField = "scheduled_at";
      sortOrder = "desc";
    }
  }

  // Data fetch
  const [tests, total] = await Promise.all([
    MyGlobal.prisma.ats_recruitment_coding_tests.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip: skipValue,
      take: limitValue,
    }),
    MyGlobal.prisma.ats_recruitment_coding_tests.count({ where }),
  ]);

  // Map Prisma (Date) fields to API contract (string & tags.Format<'date-time'>)
  return {
    pagination: {
      current: Number(pageValue),
      limit: Number(limitValue),
      records: Number(total),
      pages: Math.ceil(Number(total) / Number(limitValue)),
    },
    data: tests.map((test) => ({
      id: test.id,
      ats_recruitment_application_id: test.ats_recruitment_application_id,
      ats_recruitment_applicant_id: test.ats_recruitment_applicant_id,
      ats_recruitment_hrrecruiter_id: test.ats_recruitment_hrrecruiter_id,
      test_provider: test.test_provider,
      test_external_id:
        test.test_external_id === null ? undefined : test.test_external_id,
      status: test.status,
      scheduled_at: toISOStringSafe(test.scheduled_at),
      expiration_at:
        test.expiration_at === null || test.expiration_at === undefined
          ? undefined
          : toISOStringSafe(test.expiration_at),
    })),
  };
}
