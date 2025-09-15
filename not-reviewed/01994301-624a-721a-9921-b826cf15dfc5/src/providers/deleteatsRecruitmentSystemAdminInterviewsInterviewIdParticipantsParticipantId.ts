import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Remove a participant from an interview session
 * (ats_recruitment_interview_participants).
 *
 * This function removes the participant record from a given interview, enabling
 * withdrawal, replacement, or error correction. Operation is restricted to
 * system administrators. It performs hard delete by participantId after
 * ensuring the participant belongs to the specified interview.
 *
 * @param props - Function arguments
 * @param props.systemAdmin - Authenticated system admin payload
 * @param props.interviewId - UUID of the target interview
 * @param props.participantId - UUID of the participant to remove
 * @returns Void - No content on success
 * @throws {Error} When the participant does not exist
 * @throws {Error} When the participant does not belong to the given interview
 */
export async function deleteatsRecruitmentSystemAdminInterviewsInterviewIdParticipantsParticipantId(props: {
  systemAdmin: SystemadminPayload;
  interviewId: string & tags.Format<"uuid">;
  participantId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { interviewId, participantId } = props;

  // Step 1: Fetch and validate participant
  const participant =
    await MyGlobal.prisma.ats_recruitment_interview_participants.findUnique({
      where: { id: participantId },
      select: { ats_recruitment_interview_id: true },
    });
  if (!participant) {
    throw new Error("Participant not found");
  }
  if (participant.ats_recruitment_interview_id !== interviewId) {
    throw new Error("Participant does not belong to the specified interview");
  }

  // Step 2: Hard delete
  await MyGlobal.prisma.ats_recruitment_interview_participants.delete({
    where: { id: participantId },
  });
}
