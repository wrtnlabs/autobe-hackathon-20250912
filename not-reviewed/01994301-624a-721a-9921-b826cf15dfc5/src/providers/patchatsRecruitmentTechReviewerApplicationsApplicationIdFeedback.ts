import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentApplicationFeedback } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicationFeedback";
import { IPageIAtsRecruitmentApplicationFeedback } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentApplicationFeedback";
import { TechreviewerPayload } from "../decorators/payload/TechreviewerPayload";

/**
 * List all feedback entries for an application
 * (ats_recruitment_application_feedback).
 *
 * Retrieves a paginated list of all feedback entries (structured and free-form)
 * linked to a specific job application, from
 * ats_recruitment_application_feedback. Enables tracking of multiple reviewers'
 * ratings and comments for a candidate, supporting both HR and technical
 * reviewer participation.
 *
 * Access is restricted to authenticated tech reviewers. Results include
 * references to reviewer, score/rating, whether the feedback is a final
 * recommendation, and creation timestamp. Pagination, sorting, and filter
 * options are supported.
 *
 * @param props - The request properties
 * @param props.techReviewer - The authenticated tech reviewer
 * @param props.applicationId - Unique identifier of the application to query
 *   feedback for
 * @param props.body - Optional search, filter, and pagination options
 * @returns Paginated feedback entries per application, including reviewer,
 *   rating, comment body, final recommendation flag, and timestamp
 * @throws {Error} If the request is unauthorized or invalid
 */
export async function patchatsRecruitmentTechReviewerApplicationsApplicationIdFeedback(props: {
  techReviewer: TechreviewerPayload;
  applicationId: string & tags.Format<"uuid">;
  body: IAtsRecruitmentApplicationFeedback.IRequest;
}): Promise<IPageIAtsRecruitmentApplicationFeedback> {
  const { applicationId, body } = props;
  // Handle pagination/sorting defaults and branding
  const page = Number(body.page ?? 1);
  const limit = Number(body.limit ?? 20);
  const sortOrder: "asc" | "desc" = body.sort === "asc" ? "asc" : "desc";

  // Build where filter for Prisma
  const where: Record<string, any> = { application_id: applicationId };

  if (body.reviewer_id !== undefined && body.reviewer_id !== null) {
    where.reviewer_id = body.reviewer_id;
  }

  if (body.is_final_recommendation !== undefined) {
    where.is_final_recommendation = body.is_final_recommendation;
  }

  // Rating filter: support min, max, or both
  if (body.rating_min !== undefined && body.rating_max !== undefined) {
    where.rating = { gte: body.rating_min, lte: body.rating_max };
  } else if (body.rating_min !== undefined) {
    where.rating = { gte: body.rating_min };
  } else if (body.rating_max !== undefined) {
    where.rating = { lte: body.rating_max };
  }

  // Date filter: support from, to, or both (with toISOStringSafe)
  if (
    body.created_at_from !== undefined &&
    body.created_at_from !== null &&
    body.created_at_to !== undefined &&
    body.created_at_to !== null
  ) {
    where.created_at = { gte: body.created_at_from, lte: body.created_at_to };
  } else if (
    body.created_at_from !== undefined &&
    body.created_at_from !== null
  ) {
    where.created_at = { gte: body.created_at_from };
  } else if (body.created_at_to !== undefined && body.created_at_to !== null) {
    where.created_at = { lte: body.created_at_to };
  }

  // Count total matches and fetch paged data
  const [total, rows] = await Promise.all([
    MyGlobal.prisma.ats_recruitment_application_feedback.count({ where }),
    MyGlobal.prisma.ats_recruitment_application_feedback.findMany({
      where,
      orderBy: { created_at: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  // Build paginated result
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Math.ceil(Number(total) / Number(limit)),
    },
    data: rows.map((fb) => ({
      id: fb.id,
      application_id: fb.application_id,
      reviewer_id: fb.reviewer_id,
      feedback_body: fb.feedback_body,
      rating: fb.rating ?? undefined,
      is_final_recommendation: fb.is_final_recommendation,
      created_at: toISOStringSafe(fb.created_at), // ensure iso string & branding
    })),
  };
}
