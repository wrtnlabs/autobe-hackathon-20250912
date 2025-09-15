import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentApplicationFeedback } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicationFeedback";
import { IPageIAtsRecruitmentApplicationFeedback } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentApplicationFeedback";
import { HrrecruiterPayload } from "../decorators/payload/HrrecruiterPayload";

/**
 * List all feedback entries for an application
 * (ats_recruitment_application_feedback).
 *
 * Retrieves a paginated list of all feedback entries (structured and free-form)
 * linked to a specific job application, from
 * ats_recruitment_application_feedback. Enables tracking of multiple reviewers'
 * ratings and comments for a candidate, supporting both HR and technical
 * reviewer participation. Results include references to reviewer, score/rating,
 * and whether the feedback is a final recommendation.
 *
 * This operation enables HR recruiters and tech reviewers to review all
 * feedback entries associated with a given application. Feedback may be
 * structured (e.g., rating scores) or free-form narrative and is provided by
 * one or more reviewers. Each feedback instance records the application,
 * reviewer identity and role, feedback content, numeric rating (when present),
 * whether it represents a final recommendation, and creation timestamp.
 *
 * Results are typically paginated and can be sorted, filtered, or searched
 * (e.g., by reviewer or rating). The data is queried from
 * ats_recruitment_application_feedback and respects privacy: only authorized HR
 * recruiters, tech reviewers, or admins see all fields; applicants may not
 * access or will only see limited data, according to business policy.
 *
 * Related operations may include adding feedback, updating/deleting it (by
 * allowed users), or exporting feedback for audit and compliance. Error
 * handling addresses unauthorized requests, data not found, or access to
 * feedback not associated with the application.
 *
 * @param props - Parameters including authenticated HR recruiter,
 *   applicationId, and filtering/search body
 * @param props.hrRecruiter - The authenticated HR recruiter making the request
 * @param props.applicationId - Unique identifier of the job application for
 *   which feedback is being retrieved
 * @param props.body - Filtering, search, and pagination fields
 * @returns Paginated feedback entries, including reviewer, rating, comment
 *   body, final recommendation flag, and timestamp
 * @throws {Error} When application does not exist
 */
export async function patchatsRecruitmentHrRecruiterApplicationsApplicationIdFeedback(props: {
  hrRecruiter: HrrecruiterPayload;
  applicationId: string & tags.Format<"uuid">;
  body: IAtsRecruitmentApplicationFeedback.IRequest;
}): Promise<IPageIAtsRecruitmentApplicationFeedback> {
  const { applicationId, body } = props;
  // Ensure application exists
  const application =
    await MyGlobal.prisma.ats_recruitment_applications.findUnique({
      where: { id: applicationId },
    });
  if (!application) {
    throw new Error("Application not found");
  }

  // Pagination logic
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Build where condition
  const where: Record<string, unknown> = {
    application_id: applicationId,
    ...(body.reviewer_id !== undefined &&
      body.reviewer_id !== null && {
        reviewer_id: body.reviewer_id,
      }),
    ...(body.is_final_recommendation !== undefined && {
      is_final_recommendation: body.is_final_recommendation,
    }),
  };

  // Handle rating_min/rating_max, with correct range logic
  if (body.rating_min !== undefined && body.rating_max !== undefined) {
    where.rating = { gte: body.rating_min, lte: body.rating_max };
  } else if (body.rating_min !== undefined) {
    where.rating = { gte: body.rating_min };
  } else if (body.rating_max !== undefined) {
    where.rating = { lte: body.rating_max };
  }

  // Handle created_at_from / created_at_to as ISO strings on created_at
  if (body.created_at_from !== undefined && body.created_at_from !== null) {
    if (body.created_at_to !== undefined && body.created_at_to !== null) {
      where.created_at = { gte: body.created_at_from, lte: body.created_at_to };
    } else {
      where.created_at = { gte: body.created_at_from };
    }
  } else if (body.created_at_to !== undefined && body.created_at_to !== null) {
    where.created_at = { lte: body.created_at_to };
  }

  // Order direction/default
  const orderBy = { created_at: body.sort === "asc" ? "asc" : "desc" };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ats_recruitment_application_feedback.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.ats_recruitment_application_feedback.count({ where }),
  ]);

  const data = rows.map((row) => ({
    id: row.id,
    application_id: row.application_id,
    reviewer_id: row.reviewer_id,
    feedback_body: row.feedback_body,
    rating: row.rating,
    is_final_recommendation: row.is_final_recommendation,
    created_at: toISOStringSafe(row.created_at),
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
