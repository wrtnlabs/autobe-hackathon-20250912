import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentCodingTestSubmission } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentCodingTestSubmission";
import { IPageIAtsRecruitmentCodingTestSubmission } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentCodingTestSubmission";
import { TechreviewerPayload } from "../decorators/payload/TechreviewerPayload";

/**
 * Search and paginate submissions for a specific coding test in AtsRecruitment
 *
 * This endpoint returns a filtered and paginated list of all submissions for a
 * given coding test. Allows tech reviewers to efficiently browse, search, and
 * manage applicant attempts. Results are filtered by coding test, status,
 * review_status, submitted_at window, and presented in a paged structure for
 * user interface consumption.
 *
 * Tech reviewers must be authenticated. Permissions are enforced by requiring
 * the coding test to exist and not be soft-deleted.
 *
 * @param props - Parameters for this request
 * @param props.techReviewer - Authenticated tech reviewer (role validated by
 *   decorator)
 * @param props.codingTestId - Unique identifier of the coding test whose
 *   submissions are being listed
 * @param props.body - Query parameters and pagination controls
 * @returns Paginated, filtered submissions for the coding test
 * @throws {Error} If the coding test is not found or permission is denied
 */
export async function patchatsRecruitmentTechReviewerCodingTestsCodingTestIdSubmissions(props: {
  techReviewer: TechreviewerPayload;
  codingTestId: string & tags.Format<"uuid">;
  body: IAtsRecruitmentCodingTestSubmission.IRequest;
}): Promise<IPageIAtsRecruitmentCodingTestSubmission> {
  const { codingTestId, body } = props;

  // 1. Authorization & codingTest existence (soft-delete aware)
  const codingTest =
    await MyGlobal.prisma.ats_recruitment_coding_tests.findFirst({
      where: {
        id: codingTestId,
        deleted_at: null,
      },
    });
  if (!codingTest) {
    throw new Error("Coding test not found or access denied");
  }

  // 2. Pagination controls (enforce integer & boundaries)
  const page = body.page ?? 1;
  const limitRaw = body.limit ?? 20;
  const limit = limitRaw > 100 ? 100 : limitRaw;
  const skip = (page - 1) * limit;

  // 3. Build filter
  const where: Record<string, unknown> = {
    ats_recruitment_coding_test_id: codingTestId,
    deleted_at: null,
  };
  if (body.status !== undefined) {
    where.status = body.status;
  }
  if (body.review_status !== undefined) {
    where.review_status = body.review_status;
  }
  if ((body.submitted_after ?? body.submitted_before) !== undefined) {
    where.submitted_at = {
      ...(body.submitted_after !== undefined &&
        body.submitted_after !== null && { gte: body.submitted_after }),
      ...(body.submitted_before !== undefined &&
        body.submitted_before !== null && { lte: body.submitted_before }),
    };
  }

  // 4. Query data & count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ats_recruitment_coding_test_submissions.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ submitted_at: "desc" }, { id: "asc" }],
    }),
    MyGlobal.prisma.ats_recruitment_coding_test_submissions.count({ where }),
  ]);

  // 5. Result mapping with strict date/string handling
  const data = rows.map((row) => {
    const obj: IAtsRecruitmentCodingTestSubmission = {
      id: row.id,
      ats_recruitment_coding_test_id: row.ats_recruitment_coding_test_id,
      ats_recruitment_applicant_id: row.ats_recruitment_applicant_id,
      ats_recruitment_application_id: row.ats_recruitment_application_id,
      submitted_at: toISOStringSafe(row.submitted_at),
      status: row.status,
      review_status: row.review_status,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
    };
    if (row.answer_file_url !== undefined && row.answer_file_url !== null) {
      obj.answer_file_url = row.answer_file_url;
    }
    if (row.answer_text !== undefined && row.answer_text !== null) {
      obj.answer_text = row.answer_text;
    }
    if (
      row.received_external_at !== undefined &&
      row.received_external_at !== null
    ) {
      obj.received_external_at = toISOStringSafe(row.received_external_at);
    }
    if (row.reviewed_at !== undefined && row.reviewed_at !== null) {
      obj.reviewed_at = toISOStringSafe(row.reviewed_at);
    }
    if (
      row.review_comment_summary !== undefined &&
      row.review_comment_summary !== null
    ) {
      obj.review_comment_summary = row.review_comment_summary;
    }
    if (row.deleted_at !== undefined && row.deleted_at !== null) {
      obj.deleted_at = toISOStringSafe(row.deleted_at);
    }
    return obj;
  });

  // 6. Package pagination object with type safety
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Number(Math.ceil(total / (limit || 1))),
    },
    data,
  };
}
