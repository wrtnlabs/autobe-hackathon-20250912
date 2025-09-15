import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentInterviewParticipant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterviewParticipant";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Retrieves details of a specific interview participant.
 *
 * This endpoint allows an authorized system administrator to fetch detailed
 * information of a participant within an interview. The returned data includes
 * reference IDs, role, confirmation status, invitation time, and creation audit
 * for use in workflow, audit, and support scenarios. System admins are
 * authorized to access all participant details without restriction.
 *
 * @param props - Parameters including the systemAdmin payload, interviewId, and
 *   participantId.
 * @param props.systemAdmin - The authenticated system administrator making the
 *   request.
 * @param props.interviewId - Unique identifier of the interview containing the
 *   participant.
 * @param props.participantId - Unique identifier of the participant in
 *   question.
 * @returns The IAtsRecruitmentInterviewParticipant object with all details.
 * @throws {Error} If no participant record matching the given interview and
 *   participant IDs is found.
 */
export async function getatsRecruitmentSystemAdminInterviewsInterviewIdParticipantsParticipantId(props: {
  systemAdmin: SystemadminPayload;
  interviewId: string & tags.Format<"uuid">;
  participantId: string & tags.Format<"uuid">;
}): Promise<IAtsRecruitmentInterviewParticipant> {
  const record =
    await MyGlobal.prisma.ats_recruitment_interview_participants.findFirst({
      where: {
        id: props.participantId,
        ats_recruitment_interview_id: props.interviewId,
      },
    });
  if (!record) {
    throw new Error("Interview participant not found");
  }
  return {
    id: record.id,
    ats_recruitment_interview_id: record.ats_recruitment_interview_id,
    ats_recruitment_applicant_id:
      record.ats_recruitment_applicant_id ?? undefined,
    ats_recruitment_hrrecruiter_id:
      record.ats_recruitment_hrrecruiter_id ?? undefined,
    ats_recruitment_techreviewer_id:
      record.ats_recruitment_techreviewer_id ?? undefined,
    role: record.role,
    invited_at: toISOStringSafe(record.invited_at),
    confirmation_status: record.confirmation_status,
    created_at: toISOStringSafe(record.created_at),
  };
}
