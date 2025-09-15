import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentInterviewParticipant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterviewParticipant";
import { HrrecruiterPayload } from "../decorators/payload/HrrecruiterPayload";

/**
 * Update a specific participant's details in an interview
 * (ats_recruitment_interview_participants).
 *
 * This endpoint enables updating the role or confirmation status of a
 * participant for a given interview. Only authenticated HR recruiters can
 * perform this update.
 *
 * Authorization requires the HR recruiter to be active. Throws if the
 * participant or interview do not exist, or if the participant does not belong
 * to the interview.
 *
 * @param props - Props object
 * @param props.hrRecruiter - Authenticated HR recruiter making the update
 * @param props.interviewId - ID of the parent interview
 * @param props.participantId - ID of the participant record to update
 * @param props.body - Patch fields for participant (role/confirmation_status)
 * @returns The updated interview participant object (with ISO date strings)
 * @throws {Error} If participant not found, or if not linked to interview
 */
export async function putatsRecruitmentHrRecruiterInterviewsInterviewIdParticipantsParticipantId(props: {
  hrRecruiter: HrrecruiterPayload;
  interviewId: string & tags.Format<"uuid">;
  participantId: string & tags.Format<"uuid">;
  body: IAtsRecruitmentInterviewParticipant.IUpdate;
}): Promise<IAtsRecruitmentInterviewParticipant> {
  const { hrRecruiter, interviewId, participantId, body } = props;

  // Find the participant (scoped to interview for security)
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

  // Update only allowed fields (role, confirmation_status)
  const updated =
    await MyGlobal.prisma.ats_recruitment_interview_participants.update({
      where: { id: participantId },
      data: {
        role: body.role !== undefined ? body.role : undefined,
        confirmation_status:
          body.confirmation_status !== undefined
            ? body.confirmation_status
            : undefined,
      },
    });

  // Build API response: align optional/null-with-undefined fields, convert all dates using toISOStringSafe
  return {
    id: updated.id,
    ats_recruitment_interview_id: updated.ats_recruitment_interview_id,
    ats_recruitment_applicant_id:
      updated.ats_recruitment_applicant_id === null
        ? undefined
        : updated.ats_recruitment_applicant_id,
    ats_recruitment_hrrecruiter_id:
      updated.ats_recruitment_hrrecruiter_id === null
        ? undefined
        : updated.ats_recruitment_hrrecruiter_id,
    ats_recruitment_techreviewer_id:
      updated.ats_recruitment_techreviewer_id === null
        ? undefined
        : updated.ats_recruitment_techreviewer_id,
    role: updated.role,
    invited_at: toISOStringSafe(updated.invited_at),
    confirmation_status: updated.confirmation_status,
    created_at: toISOStringSafe(updated.created_at),
  };
}
