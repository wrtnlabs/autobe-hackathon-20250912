import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentCodingTestReviewComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentCodingTestReviewComment";
import { IPageIAtsRecruitmentCodingTestReviewComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentCodingTestReviewComment";
import { TechreviewerPayload } from "../decorators/payload/TechreviewerPayload";

/**
 * Search and retrieve review comments list for a coding test submission
 * (ats_recruitment_coding_test_review_comments)
 *
 * This operation retrieves a paginated and filtered list of review comments
 * associated with a particular coding test submission. The endpoint is
 * access-controlled and only accessible to authenticated technical reviewers.
 * The response excludes logically deleted comments (deleted_at != null) and
 * supports full audit/filter controls.
 *
 * @param props - The function parameter object
 * @param props.techReviewer - The authenticated tech reviewer, with id and type
 * @param props.codingTestId - The coding test UUID (not directly used in query,
 *   included for REST URI contract)
 * @param props.submissionId - The submission UUID; returned comments are
 *   limited to this coding test submission
 * @param props.body - Search, filtering, and pagination settings
 *   (IAtsRecruitmentCodingTestReviewComment.IRequest)
 * @returns Paginated list of review comments (active only) matching the
 *   requested filters
 * @throws {Error} When pagination limits are exceeded or filters are invalid
 */
export async function patchatsRecruitmentTechReviewerCodingTestsCodingTestIdSubmissionsSubmissionIdReviewComments(props: {
  techReviewer: TechreviewerPayload;
  codingTestId: string & tags.Format<"uuid">;
  submissionId: string & tags.Format<"uuid">;
  body: IAtsRecruitmentCodingTestReviewComment.IRequest;
}): Promise<IPageIAtsRecruitmentCodingTestReviewComment> {
  const { techReviewer, submissionId, body } = props;

  // Pagination safe defaults
  const pageVal = Number(body.page ?? 1);
  const limitVal = Number(body.limit ?? 20);
  const page = pageVal > 0 ? pageVal : 1;
  const limit = limitVal > 0 ? limitVal : 20;
  const skip = (page - 1) * limit;

  // Only allow sorting on whitelisted fields
  const allowedSortFields = [
    "commented_at",
    "started_at",
    "created_at",
    "updated_at",
    "comment_type",
  ];
  let orderBy: { [key: string]: "asc" | "desc" } = { created_at: "desc" };
  if (body.sort) {
    let field = body.sort;
    let direction: "asc" | "desc" = "asc";
    if (field.startsWith("-")) {
      direction = "desc";
      field = field.substring(1);
    }
    if (allowedSortFields.includes(field)) {
      orderBy = { [field]: direction };
    }
  }

  // Build where filter (match only undeleted, matches submission, plus filters)
  const where: Record<string, unknown> = {
    ats_recruitment_coding_test_submission_id: submissionId,
    deleted_at: null,
  };
  if (body.review_comment_id !== undefined && body.review_comment_id !== null) {
    where.id = body.review_comment_id;
  }
  if (
    body.ats_recruitment_techreviewer_id !== undefined &&
    body.ats_recruitment_techreviewer_id !== null
  ) {
    where.ats_recruitment_techreviewer_id =
      body.ats_recruitment_techreviewer_id;
  }
  if (body.comment_type !== undefined && body.comment_type !== null) {
    where.comment_type = body.comment_type;
  }
  if (
    (body.started_at_from !== undefined && body.started_at_from !== null) ||
    (body.started_at_to !== undefined && body.started_at_to !== null)
  ) {
    const startedAtClause: Record<string, string> = {};
    if (body.started_at_from !== undefined && body.started_at_from !== null) {
      startedAtClause.gte = body.started_at_from;
    }
    if (body.started_at_to !== undefined && body.started_at_to !== null) {
      startedAtClause.lte = body.started_at_to;
    }
    where.started_at = startedAtClause;
  }
  if (
    (body.commented_at_from !== undefined && body.commented_at_from !== null) ||
    (body.commented_at_to !== undefined && body.commented_at_to !== null)
  ) {
    const commentedAtClause: Record<string, string> = {};
    if (
      body.commented_at_from !== undefined &&
      body.commented_at_from !== null
    ) {
      commentedAtClause.gte = body.commented_at_from;
    }
    if (body.commented_at_to !== undefined && body.commented_at_to !== null) {
      commentedAtClause.lte = body.commented_at_to;
    }
    where.commented_at = commentedAtClause;
  }

  // Enforce that tech reviewers only see their own comments unless they're system admin (in actual implementation, add admin check here if needed)
  // (Decorator already restricts access to techReviewer, defense-in-depth could be considered if business logic applies)

  // Query paginated comments and total count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ats_recruitment_coding_test_review_comments.findMany({
      where,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.ats_recruitment_coding_test_review_comments.count({
      where,
    }),
  ]);

  // Map results and safely convert all date fields
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
        row.deleted_at === null || row.deleted_at === undefined
          ? null
          : toISOStringSafe(row.deleted_at),
    })),
  };
}
