import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentInterview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterview";
import { HrrecruiterPayload } from "../decorators/payload/HrrecruiterPayload";

/**
 * Retrieve full detail about a single interview (ats_recruitment_interviews
 * table) and its related entities by interviewId.
 *
 * Fetches detailed information for a specific interview instance, as found in
 * the ats_recruitment_interviews table, identified by its unique interviewId.
 * Access is limited to authorized HR staff who are participants in the
 * interview. Returns the interview's detailed info, including stage, status,
 * participants (checked for this HR recruiter role), and timestamps. Throws an
 * error if the interview does not exist, is deleted, or the recruiter is not
 * assigned as a participant.
 *
 * @param props - Function parameter object
 * @param props.hrRecruiter - The authorized HR recruiter making the request
 * @param props.interviewId - The interview UUID to fetch
 * @returns The full detailed interview record as IAtsRecruitmentInterview
 * @throws {Error} If interview not found, soft-deleted, or recruiter is not an
 *   authorized participant
 */
export async function getatsRecruitmentHrRecruiterInterviewsInterviewId(props: {
  hrRecruiter: HrrecruiterPayload;
  interviewId: string & tags.Format<"uuid">;
}): Promise<IAtsRecruitmentInterview> {
  // 1. Fetch interview record (must not be deleted)
  const interview = await MyGlobal.prisma.ats_recruitment_interviews.findFirst({
    where: {
      id: props.interviewId,
      deleted_at: null,
    },
  });

  if (!interview) {
    throw new Error("Interview not found");
  }

  // 2. Authorization: Ensure HR recruiter is a participant in this interview
  const participant =
    await MyGlobal.prisma.ats_recruitment_interview_participants.findFirst({
      where: {
        ats_recruitment_interview_id: props.interviewId,
        ats_recruitment_hrrecruiter_id: props.hrRecruiter.id,
      },
    });

  if (!participant) {
    throw new Error(
      "Unauthorized: You are not a participant in this interview",
    );
  }

  // 3. Return the interview fields, converting all date/time fields per rules
  return {
    id: interview.id,
    ats_recruitment_application_id: interview.ats_recruitment_application_id,
    title: interview.title,
    stage: interview.stage,
    status: interview.status,
    notes: interview.notes ?? undefined,
    created_at: toISOStringSafe(interview.created_at),
    updated_at: toISOStringSafe(interview.updated_at),
    deleted_at:
      interview.deleted_at === null || interview.deleted_at === undefined
        ? undefined
        : toISOStringSafe(interview.deleted_at),
  };
}
