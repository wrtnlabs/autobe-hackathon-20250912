import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentInterviewParticipant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterviewParticipant";
import { HrrecruiterPayload } from "../decorators/payload/HrrecruiterPayload";

/**
 * Get details on a specific interview participant
 * (ats_recruitment_interview_participants table).
 *
 * Retrieves detailed participant data for a given interview and participant
 * record, with authorization for the HR recruiter role. Only HR recruiters that
 * are assigned participants in the interview may access participant details.
 *
 * @param props - Request props: hrRecruiter (auth payload), interviewId,
 *   participantId
 * @returns The interview participant details with metadata
 * @throws {Error} If not found, or forbidden
 */
export async function getatsRecruitmentHrRecruiterInterviewsInterviewIdParticipantsParticipantId(props: {
  hrRecruiter: HrrecruiterPayload;
  interviewId: string & tags.Format<"uuid">;
  participantId: string & tags.Format<"uuid">;
}): Promise<IAtsRecruitmentInterviewParticipant> {
  const { hrRecruiter, interviewId, participantId } = props;
  // 1. Fetch participant row for this interview
  const participant =
    await MyGlobal.prisma.ats_recruitment_interview_participants.findFirst({
      where: {
        id: participantId,
        ats_recruitment_interview_id: interviewId,
      },
    });
  if (!participant) {
    throw new Error("Participant not found");
  }
  // 2. Authorization: HR recruiter must be a participant on this interview
  const authorizedHr =
    await MyGlobal.prisma.ats_recruitment_interview_participants.findFirst({
      where: {
        ats_recruitment_interview_id: interviewId,
        ats_recruitment_hrrecruiter_id: hrRecruiter.id,
      },
    });
  if (!authorizedHr) {
    throw new Error("Forbidden");
  }
  // 3. Present participant details in required DTO
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
