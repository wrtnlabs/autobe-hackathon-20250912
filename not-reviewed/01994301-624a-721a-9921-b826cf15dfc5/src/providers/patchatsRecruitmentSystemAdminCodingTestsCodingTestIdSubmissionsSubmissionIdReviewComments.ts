import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentCodingTestReviewComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentCodingTestReviewComment";
import { IPageIAtsRecruitmentCodingTestReviewComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentCodingTestReviewComment";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Search and retrieve review comments list for a coding test submission
 * (ats_recruitment_coding_test_review_comments)
 *
 * Retrieves a paginated and filtered list of review comments for a specific
 * coding test submission, ensuring only authorized system administrators may
 * access the records. Supports advanced filtering, sorting, and paging with
 * full compliance to schema. Comments are strictly excluded if soft-deleted,
 * and all results include relevant reviewer and timing information per
 * audit/compliance needs.
 *
 * @param props - Operation input parameters
 * @param props.systemAdmin - The authenticated SystemadminPayload; must be
 *   present for endpoint to authorize access
 * @param props.codingTestId - The ID of the coding test record (not filtered on
 *   query; provided as param for path context)
 * @param props.submissionId - The ID of the coding test submission to filter
 *   review comments for
 * @param props.body - Filtering and paging controls
 *   (IAtsRecruitmentCodingTestReviewComment.IRequest)
 * @returns IPageIAtsRecruitmentCodingTestReviewComment - A paginated object
 *   containing review comment records for the given submission
 * @throws {Error} - If access is not permitted or business constraints are
 *   violated (should not occur given controller validation)
 */
export async function patchatsRecruitmentSystemAdminCodingTestsCodingTestIdSubmissionsSubmissionIdReviewComments(props: {
  systemAdmin: SystemadminPayload;
  codingTestId: string & tags.Format<"uuid">;
  submissionId: string & tags.Format<"uuid">;
  body: IAtsRecruitmentCodingTestReviewComment.IRequest;
}): Promise<IPageIAtsRecruitmentCodingTestReviewComment> {
  const { systemAdmin, submissionId, body } = props;

  // Enforce pagination defaults and soft maximum
  const page = body.page && body.page > 0 ? body.page : 1;
  const limit =
    body.limit && body.limit > 0 ? (body.limit > 100 ? 100 : body.limit) : 20;
  const skip = (page - 1) * limit;

  // WHERE clause, assembled for Prisma
  const where = {
    ats_recruitment_coding_test_submission_id: submissionId,
    deleted_at: null,
    ...(body.review_comment_id !== undefined &&
      body.review_comment_id !== null && {
        id: body.review_comment_id,
      }),
    ...(body.ats_recruitment_techreviewer_id !== undefined &&
      body.ats_recruitment_techreviewer_id !== null && {
        ats_recruitment_techreviewer_id: body.ats_recruitment_techreviewer_id,
      }),
    ...(body.comment_type !== undefined &&
      body.comment_type !== null && {
        comment_type: body.comment_type,
      }),
    // Date/time range filtering for started_at
    ...(((body.started_at_from !== undefined &&
      body.started_at_from !== null) ||
      (body.started_at_to !== undefined && body.started_at_to !== null)) && {
      started_at: {
        ...(body.started_at_from !== undefined &&
          body.started_at_from !== null && {
            gte: body.started_at_from,
          }),
        ...(body.started_at_to !== undefined &&
          body.started_at_to !== null && {
            lte: body.started_at_to,
          }),
      },
    }),
    // Date/time range filtering for commented_at
    ...(((body.commented_at_from !== undefined &&
      body.commented_at_from !== null) ||
      (body.commented_at_to !== undefined &&
        body.commented_at_to !== null)) && {
      commented_at: {
        ...(body.commented_at_from !== undefined &&
          body.commented_at_from !== null && {
            gte: body.commented_at_from,
          }),
        ...(body.commented_at_to !== undefined &&
          body.commented_at_to !== null && {
            lte: body.commented_at_to,
          }),
      },
    }),
  };

  // Allowable sort fields only
  const allowedSortFields = ["commented_at", "created_at", "updated_at"];
  let orderBy: { [key: string]: "asc" | "desc" } = { commented_at: "desc" };
  if (body.sort && typeof body.sort === "string") {
    const sortFieldRaw = body.sort.replace(/^[+-]/, "");
    if (allowedSortFields.includes(sortFieldRaw)) {
      const direction: "asc" | "desc" = body.sort.startsWith("+")
        ? "asc"
        : "desc";
      orderBy = { [sortFieldRaw]: direction };
    }
  }

  // Query DB & count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ats_recruitment_coding_test_review_comments.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.ats_recruitment_coding_test_review_comments.count({
      where,
    }),
  ]);

  // Convert Prisma rows to strict DTO with toISOStringSafe for all date fields
  const data = rows.map((row) => {
    return {
      id: row.id,
      ats_recruitment_coding_test_submission_id:
        row.ats_recruitment_coding_test_submission_id,
      ats_recruitment_techreviewer_id: row.ats_recruitment_techreviewer_id,
      comment_text: row.comment_text,
      comment_type: row.comment_type,
      started_at: toISOStringSafe(row.started_at),
      commented_at: toISOStringSafe(row.commented_at),
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
      deleted_at:
        row.deleted_at !== null && row.deleted_at !== undefined
          ? toISOStringSafe(row.deleted_at)
          : undefined,
    };
  });

  // Calculate pagination output values using plain Number for stripping tags
  const safePage = Number(page);
  const safeLimit = Number(limit);

  return {
    pagination: {
      current: safePage,
      limit: safeLimit,
      records: total,
      pages: safeLimit > 0 ? Math.ceil(total / safeLimit) : 0,
    },
    data,
  };
}
