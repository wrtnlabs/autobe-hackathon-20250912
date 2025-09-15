import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentCodingTest } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentCodingTest";
import { IPageIAtsRecruitmentCodingTest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentCodingTest";
import { TechreviewerPayload } from "../decorators/payload/TechreviewerPayload";

/**
 * Retrieve paginated/searchable lists of coding tests with advanced filtering.
 *
 * This endpoint returns a paginated list of coding test assignments, supporting
 * advanced searching, filtering, and sorting by provider, status, applicant,
 * job posting, and scheduling.
 *
 * Tech reviewers may filter tests by applicant or job posting; only non-deleted
 * tests are included. Results include test schedule, delivery/expiration,
 * actors, and status, with robust pagination.
 *
 * Authorization is enforced by decorator (techReviewer role); access to all
 * records is permitted for tech reviewers. Parameter errors or search failures
 * yield appropriate error codes.
 *
 * @param props - Properties required for retrieving coding tests
 * @param props.techReviewer - Authenticated TechreviewerPayload acting as the
 *   requesting reviewer
 * @param props.body - Request body containing filters, pagination, and sorting
 * @returns Paginated summary (IPageIAtsRecruitmentCodingTest.ISummary) of
 *   coding tests
 * @throws {Error} On internal query error, unexpected parameters, or database
 *   failures
 */
export async function patchatsRecruitmentTechReviewerCodingTests(props: {
  techReviewer: TechreviewerPayload;
  body: IAtsRecruitmentCodingTest.IRequest;
}): Promise<IPageIAtsRecruitmentCodingTest.ISummary> {
  const { body } = props;
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Determine orderBy for sorting (default: -scheduled_at = desc)
  const orderBy = (() => {
    if (typeof body.sort === "string" && body.sort.length > 0) {
      const desc = body.sort[0] === "-";
      const field = body.sort.replace(/^[-+]/, "");
      // Only allow known fields to sort:
      switch (field) {
        case "scheduled_at":
        case "created_at":
        case "status":
          return { [field]: desc ? "desc" : "asc" };
        default:
          return { scheduled_at: "desc" };
      }
    }
    return { scheduled_at: "desc" };
  })();

  // Build filter (non-deleted only); all filters must exclude null for required schema fields
  const where = {
    deleted_at: null,
    ...(body.test_provider !== undefined &&
      body.test_provider !== null && {
        test_provider: body.test_provider,
      }),
    ...(body.status !== undefined &&
      body.status !== null && {
        status: body.status,
      }),
    // Scheduling window (from, to): always check both for overlapping/merge
    ...((body.scheduled_from !== undefined && body.scheduled_from !== null) ||
    (body.scheduled_to !== undefined && body.scheduled_to !== null)
      ? {
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
        }
      : {}),
    ...(body.applicant_id !== undefined &&
      body.applicant_id !== null && {
        ats_recruitment_applicant_id: body.applicant_id,
      }),
    ...(body.job_posting_id !== undefined &&
      body.job_posting_id !== null && {
        ats_recruitment_application_id: body.job_posting_id,
      }),
  };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ats_recruitment_coding_tests.findMany({
      where,
      orderBy,
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

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map((row) => ({
      id: row.id,
      ats_recruitment_application_id: row.ats_recruitment_application_id,
      ats_recruitment_applicant_id: row.ats_recruitment_applicant_id,
      ats_recruitment_hrrecruiter_id: row.ats_recruitment_hrrecruiter_id,
      test_provider: row.test_provider,
      test_external_id:
        row.test_external_id !== null && row.test_external_id !== undefined
          ? row.test_external_id
          : undefined,
      status: row.status,
      scheduled_at: toISOStringSafe(row.scheduled_at),
      expiration_at:
        row.expiration_at !== null && row.expiration_at !== undefined
          ? toISOStringSafe(row.expiration_at)
          : undefined,
    })),
  };
}
