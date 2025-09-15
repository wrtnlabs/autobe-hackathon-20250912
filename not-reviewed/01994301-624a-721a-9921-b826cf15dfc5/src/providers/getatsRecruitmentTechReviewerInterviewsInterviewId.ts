import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentInterview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterview";
import { TechreviewerPayload } from "../decorators/payload/TechreviewerPayload";

/**
 * Retrieve full detail about a single interview (ats_recruitment_interviews
 * table) and its related entities by interviewId.
 *
 * Allows a tech reviewer to access the details of a specific interview they are
 * assigned to as a participant. Returns the interview's core attributes,
 * including stage, status, and notes, enforcing that only authorized tech
 * reviewers with matching participation may access. Soft-deleted interviews are
 * excluded for business and privacy compliance.
 *
 * Authorization: Tech reviewer must be a participant in the interview
 * (ats_recruitment_interview_participants table,
 * ats_recruitment_techreviewer_id matches payload.id).
 *
 * @param props - The request object containing:
 *
 *   - TechReviewer: TechreviewerPayload; // Authenticated tech reviewer (role:
 *       techReviewer)
 *   - InterviewId: string & tags.Format<'uuid'>; // ID of the interview to fetch
 *
 * @returns IAtsRecruitmentInterview with full field-level detail
 * @throws {Error} 404 if not found, 403 if not authorized
 */
export async function getatsRecruitmentTechReviewerInterviewsInterviewId(props: {
  techReviewer: TechreviewerPayload;
  interviewId: string & tags.Format<"uuid">;
}): Promise<IAtsRecruitmentInterview> {
  const { techReviewer, interviewId } = props;

  // 1. Fetch the interview (active only)
  const interview = await MyGlobal.prisma.ats_recruitment_interviews.findFirst({
    where: {
      id: interviewId,
      deleted_at: null,
    },
  });
  if (!interview) throw new Error("Interview not found"); // 404

  // 2. Verify the tech reviewer is a participant in this interview
  const participant =
    await MyGlobal.prisma.ats_recruitment_interview_participants.findFirst({
      where: {
        ats_recruitment_interview_id: interviewId,
        ats_recruitment_techreviewer_id: techReviewer.id,
      },
    });
  if (!participant)
    throw new Error("Forbidden: You are not a participant in this interview"); // 403

  // 3. Return normalized interview detail (strict date and null/undefined policies)
  return {
    id: interview.id,
    ats_recruitment_application_id: interview.ats_recruitment_application_id,
    title: interview.title,
    stage: interview.stage,
    status: interview.status,
    notes:
      interview.notes !== undefined && interview.notes !== null
        ? interview.notes
        : undefined,
    created_at: toISOStringSafe(interview.created_at),
    updated_at: toISOStringSafe(interview.updated_at),
    deleted_at:
      interview.deleted_at !== undefined && interview.deleted_at !== null
        ? toISOStringSafe(interview.deleted_at)
        : undefined,
  };
}
