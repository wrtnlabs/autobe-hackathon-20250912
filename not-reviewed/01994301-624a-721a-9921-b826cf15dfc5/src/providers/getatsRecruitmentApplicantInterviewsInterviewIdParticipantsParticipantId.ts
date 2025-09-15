import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentInterviewParticipant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterviewParticipant";
import { ApplicantPayload } from "../decorators/payload/ApplicantPayload";

/**
 * Get details on a specific interview participant
 * (ats_recruitment_interview_participants table).
 *
 * Retrieves the full details of a specific participant in an interview,
 * identified by both interviewId and participantId. Ensures the requesting
 * applicant is authorized and only able to view details if assigned as the
 * participant.
 *
 * This lookup supports participant self-service, enables applicants to view
 * their role, status, and invitation metadata for a given interview.
 * Authorization is enforced: only the participant applicant may fetch their own
 * participant row via this endpoint. Errors are thrown for unauthorized access
 * or missing records.
 *
 * @param props - Object containing required properties
 * @param props.applicant - The authenticated applicant making the request
 * @param props.interviewId - The unique identifier for the parent interview
 * @param props.participantId - Unique identifier of the interview participant
 *   record
 * @returns The interview participant entity and relevant metadata (role,
 *   status, invite, etc.)
 * @throws {Error} If the participant does not exist or the applicant is not
 *   assigned
 */
export async function getatsRecruitmentApplicantInterviewsInterviewIdParticipantsParticipantId(props: {
  applicant: ApplicantPayload;
  interviewId: string & tags.Format<"uuid">;
  participantId: string & tags.Format<"uuid">;
}): Promise<IAtsRecruitmentInterviewParticipant> {
  const { applicant, interviewId, participantId } = props;

  const participant =
    await MyGlobal.prisma.ats_recruitment_interview_participants.findFirst({
      where: {
        id: participantId,
        ats_recruitment_interview_id: interviewId,
      },
    });

  if (!participant) {
    throw new Error("Interview participant not found");
  }
  if (participant.ats_recruitment_applicant_id !== applicant.id) {
    throw new Error(
      "Unauthorized: you are not assigned to this interview participant",
    );
  }

  return {
    id: participant.id,
    ats_recruitment_interview_id: participant.ats_recruitment_interview_id,
    ats_recruitment_applicant_id:
      participant.ats_recruitment_applicant_id ?? undefined,
    ats_recruitment_hrrecruiter_id:
      participant.ats_recruitment_hrrecruiter_id ?? undefined,
    ats_recruitment_techreviewer_id:
      participant.ats_recruitment_techreviewer_id ?? undefined,
    role: participant.role,
    invited_at: toISOStringSafe(participant.invited_at),
    confirmation_status: participant.confirmation_status,
    created_at: toISOStringSafe(participant.created_at),
  };
}
