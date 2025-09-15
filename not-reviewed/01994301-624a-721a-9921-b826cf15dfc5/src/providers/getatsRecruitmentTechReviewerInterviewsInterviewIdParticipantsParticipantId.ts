import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentInterviewParticipant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterviewParticipant";
import { TechreviewerPayload } from "../decorators/payload/TechreviewerPayload";

/**
 * Get details on a specific interview participant
 * (ats_recruitment_interview_participants table).
 *
 * Retrieves details of a participant in a given interview, ensuring only tech
 * reviewers involved with that interview are authorized to access details.
 * Returns role, status, and invitation meta, as well as applicant or HR or tech
 * reviewer references as appropriate. Throws if not found or not authorized.
 *
 * @param props - Object containing all necessary parameters
 * @param props.techReviewer - The authenticated tech reviewer making the
 *   request
 * @param props.interviewId - Unique identifier of the parent interview
 * @param props.participantId - Unique identifier of the interview participant
 * @returns The interview participant entity and relevant metadata
 * @throws {Error} When the participant does not exist or the requesting tech
 *   reviewer is not a participant of the same interview
 */
export async function getatsRecruitmentTechReviewerInterviewsInterviewIdParticipantsParticipantId(props: {
  techReviewer: TechreviewerPayload;
  interviewId: string & tags.Format<"uuid">;
  participantId: string & tags.Format<"uuid">;
}): Promise<IAtsRecruitmentInterviewParticipant> {
  const { techReviewer, interviewId, participantId } = props;

  // Fetch participant by id and interview
  const participant =
    await MyGlobal.prisma.ats_recruitment_interview_participants.findFirst({
      where: { id: participantId, ats_recruitment_interview_id: interviewId },
    });

  if (!participant) {
    throw new Error("Participant not found");
  }

  // Authorization: Only tech reviewers who are assigned as a participant in the interview may view
  const isAuthorizedReviewer =
    await MyGlobal.prisma.ats_recruitment_interview_participants.findFirst({
      where: {
        ats_recruitment_interview_id: interviewId,
        ats_recruitment_techreviewer_id: techReviewer.id,
      },
    });
  if (!isAuthorizedReviewer) {
    throw new Error("Forbidden");
  }

  return {
    id: participant.id,
    ats_recruitment_interview_id: participant.ats_recruitment_interview_id,
    ats_recruitment_applicant_id:
      participant.ats_recruitment_applicant_id === null
        ? undefined
        : participant.ats_recruitment_applicant_id,
    ats_recruitment_hrrecruiter_id:
      participant.ats_recruitment_hrrecruiter_id === null
        ? undefined
        : participant.ats_recruitment_hrrecruiter_id,
    ats_recruitment_techreviewer_id:
      participant.ats_recruitment_techreviewer_id === null
        ? undefined
        : participant.ats_recruitment_techreviewer_id,
    role: participant.role,
    invited_at: toISOStringSafe(participant.invited_at),
    confirmation_status: participant.confirmation_status,
    created_at: toISOStringSafe(participant.created_at),
  };
}
