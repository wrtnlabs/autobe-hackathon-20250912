import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { HrrecruiterPayload } from "../decorators/payload/HrrecruiterPayload";

/**
 * Soft-delete (mark as deleted) a scheduled interview
 * (ats_recruitment_interviews table).
 *
 * This operation sets the `deleted_at` timestamp of the interview with the
 * specified interviewId, effectively removing it from standard query results.
 * Only authorized HR recruiters can perform this operation. The delete cannot
 * be performed if the interview is already in a completed or interviewed state.
 * If the interview does not exist or is already deleted, an error is thrown.
 * Associated participants and schedules are not removed, per policy.
 *
 * @param props - Object containing the authenticated HR recruiter and the
 *   interview UUID.
 * @param props.hrRecruiter - Authenticated HR recruiter performing the
 *   deletion.
 * @param props.interviewId - UUID of the interview to soft-delete.
 * @returns Void
 * @throws {Error} If the interview does not exist, is already deleted, or is
 *   not allowed to be deleted due to its state.
 */
export async function deleteatsRecruitmentHrRecruiterInterviewsInterviewId(props: {
  hrRecruiter: HrrecruiterPayload;
  interviewId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { hrRecruiter, interviewId } = props;

  // Step 1: Find and validate interview existence and eligibility
  const interview = await MyGlobal.prisma.ats_recruitment_interviews.findFirst({
    where: {
      id: interviewId,
      deleted_at: null,
    },
  });

  if (!interview) {
    throw new Error("Interview not found or already deleted");
  }

  // Step 2: Only allow delete if interview is not completed or interviewed
  if (interview.status === "completed" || interview.status === "interviewed") {
    throw new Error("Cannot delete a completed or interviewed interview");
  }

  // Step 3: Apply soft-delete by setting deleted_at
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  await MyGlobal.prisma.ats_recruitment_interviews.update({
    where: { id: interviewId },
    data: { deleted_at: now },
  });
}
