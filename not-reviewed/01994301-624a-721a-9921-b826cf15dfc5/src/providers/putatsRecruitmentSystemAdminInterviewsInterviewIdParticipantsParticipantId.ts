import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentInterviewParticipant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterviewParticipant";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Update a specific participant's details in an interview.
 *
 * This endpoint enables the modification of participant information for a
 * specific interview from the ats_recruitment_interview_participants table.
 * Only "role" and "confirmation_status" fields are updatable. Attempts to
 * update any other field(s) will have no effect. The operation performs a
 * strict lookup by both interviewId and participantId, ensuring the participant
 * belongs to the given interview. Returns the fully updated participant record
 * in strict DTO shape, with all date fields returned as ISO 8601 strings
 * branded to the correct type.
 *
 * Authorization: Only authenticated system admin users may perform this
 * operation. Business-level validation for allowed values is assumed to be
 * handled upstream or via domain rules.
 *
 * @param props - Operation properties
 * @param props.systemAdmin - Authenticated system admin making this request
 * @param props.interviewId - The interview ID for context (UUID, required)
 * @param props.participantId - The participant record ID (UUID, required)
 * @param props.body - Fields to update (may include 'role' and/or
 *   'confirmation_status')
 * @returns The updated participant information after applying all valid changes
 * @throws {Error} If participant does not exist for given IDs
 */
export async function putatsRecruitmentSystemAdminInterviewsInterviewIdParticipantsParticipantId(props: {
  systemAdmin: SystemadminPayload;
  interviewId: string & tags.Format<"uuid">;
  participantId: string & tags.Format<"uuid">;
  body: IAtsRecruitmentInterviewParticipant.IUpdate;
}): Promise<IAtsRecruitmentInterviewParticipant> {
  const { interviewId, participantId, body } = props;
  // Find participant row strictly matching both IDs
  const participant =
    await MyGlobal.prisma.ats_recruitment_interview_participants.findFirst({
      where: {
        id: participantId,
        ats_recruitment_interview_id: interviewId,
      },
    });
  if (!participant) throw new Error("Participant not found");

  // Update only allowed fields
  const updated =
    await MyGlobal.prisma.ats_recruitment_interview_participants.update({
      where: { id: participantId },
      data: {
        role: body.role ?? undefined,
        confirmation_status: body.confirmation_status ?? undefined,
      },
    });

  return {
    id: updated.id,
    ats_recruitment_interview_id: updated.ats_recruitment_interview_id,
    ats_recruitment_applicant_id:
      updated.ats_recruitment_applicant_id ?? undefined,
    ats_recruitment_hrrecruiter_id:
      updated.ats_recruitment_hrrecruiter_id ?? undefined,
    ats_recruitment_techreviewer_id:
      updated.ats_recruitment_techreviewer_id ?? undefined,
    role: updated.role,
    invited_at: toISOStringSafe(updated.invited_at),
    confirmation_status: updated.confirmation_status,
    created_at: toISOStringSafe(updated.created_at),
  };
}
