import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentCodingTestSubmission } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentCodingTestSubmission";
import { IPageIAtsRecruitmentCodingTestSubmission } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentCodingTestSubmission";
import { HrrecruiterPayload } from "../decorators/payload/HrrecruiterPayload";

/**
 * Search and paginate submissions for a specific coding test in AtsRecruitment
 *
 * Retrieves a filtered and paginated list of submissions for a specific coding
 * test. This operation is used by HR recruiters and technical reviewers to view
 * all applicant attempts for a given coding test identified by codingTestId.
 * Operates on the ats_recruitment_coding_test_submissions table, supporting
 * search, review status filtering, time range queries, and pagination/sorting
 * criteria. This API enables efficient monitoring and review workflows around
 * coding assessment submissions in the interview pipeline.
 *
 * @param props - Request properties
 * @param props.hrRecruiter - The authenticated HR recruiter (authorization
 *   handled by decorator)
 * @param props.codingTestId - The unique identifier of the coding test being
 *   listed
 * @param props.body - Object containing search and pagination filters (status,
 *   review_status, submitted_after/before, page, limit)
 * @returns Paginated, filtered list of submissions for the specified coding
 *   test, matching request criteria
 * @throws {Error} If the specified coding test does not exist or has been
 *   deleted
 */
export async function patchatsRecruitmentHrRecruiterCodingTestsCodingTestIdSubmissions(props: {
  hrRecruiter: HrrecruiterPayload;
  codingTestId: string & tags.Format<"uuid">;
  body: IAtsRecruitmentCodingTestSubmission.IRequest;
}): Promise<IPageIAtsRecruitmentCodingTestSubmission> {
  const { codingTestId, body } = props;
  // 1. Validate coding test exists and is not deleted
  const codingTest =
    await MyGlobal.prisma.ats_recruitment_coding_tests.findFirst({
      where: {
        id: codingTestId,
        deleted_at: null,
      },
    });
  if (!codingTest) {
    throw new Error("Coding test not found or has been deleted.");
  }

  // 2. Pagination: enforce numeric bounds only via primitives
  const page = body.page ?? 1;
  const rawLimit =
    body.limit !== undefined && body.limit !== null ? body.limit : 10;
  const limit = rawLimit > 100 ? 100 : rawLimit;
  const skip = (page - 1) * limit;

  // 3. Build WHERE filter
  const where = {
    ats_recruitment_coding_test_id: codingTestId,
    deleted_at: null,
    ...(body.status !== undefined &&
      body.status !== null && { status: body.status }),
    ...(body.review_status !== undefined &&
      body.review_status !== null && { review_status: body.review_status }),
    ...(body.submitted_after !== undefined ||
    body.submitted_before !== undefined
      ? {
          submitted_at: {
            ...(body.submitted_after !== undefined &&
            body.submitted_after !== null
              ? { gte: body.submitted_after }
              : {}),
            ...(body.submitted_before !== undefined &&
            body.submitted_before !== null
              ? { lte: body.submitted_before }
              : {}),
          },
        }
      : {}),
  };

  // 4. Query data and count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ats_recruitment_coding_test_submissions.findMany({
      where,
      orderBy: { submitted_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.ats_recruitment_coding_test_submissions.count({ where }),
  ]);

  // 5. Build API output - ensure all Date fields converted
  const data: IAtsRecruitmentCodingTestSubmission[] = rows.map(
    (submission) => ({
      id: submission.id,
      ats_recruitment_coding_test_id: submission.ats_recruitment_coding_test_id,
      ats_recruitment_applicant_id: submission.ats_recruitment_applicant_id,
      ats_recruitment_application_id: submission.ats_recruitment_application_id,
      submitted_at: toISOStringSafe(submission.submitted_at),
      answer_file_url: submission.answer_file_url ?? undefined,
      answer_text: submission.answer_text ?? undefined,
      status: submission.status,
      received_external_at: submission.received_external_at
        ? toISOStringSafe(submission.received_external_at)
        : undefined,
      review_status: submission.review_status,
      reviewed_at: submission.reviewed_at
        ? toISOStringSafe(submission.reviewed_at)
        : undefined,
      review_comment_summary: submission.review_comment_summary ?? undefined,
      created_at: toISOStringSafe(submission.created_at),
      updated_at: toISOStringSafe(submission.updated_at),
      deleted_at: submission.deleted_at
        ? toISOStringSafe(submission.deleted_at)
        : undefined,
    }),
  );
  // 6. Return paginated result (dates int32, no branding assertions)
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
