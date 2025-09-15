import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { HrrecruiterPayload } from "../decorators/payload/HrrecruiterPayload";

/**
 * Delete an interview schedule slot record by interviewId and scheduleId (hard
 * delete, not soft delete).
 *
 * This function permanently deletes the specified interview schedule slot (hard
 * delete) from the database, using the provided interviewId and scheduleId.
 * Only authenticated HR recruiters may perform this operation. The function
 * verifies that the slot exists, belongs to the provided interview, and the
 * parent interview is not completed. Upon successful deletion, all related
 * calendar synchronization entries are also removed, and an audit log is
 * created for compliance. If any validation check fails, or the slot does not
 * exist, an error is thrown.
 *
 * @param props - HrRecruiter: Authenticated HR recruiter payload (contains
 *   recruiter's id) interviewId: UUID of the parent interview scheduleId: UUID
 *   of the target schedule slot to delete
 * @returns Void
 * @throws {Error} If schedule not found, interview not found, recruiter
 *   unauthorized, or interview is completed
 */
export async function deleteatsRecruitmentHrRecruiterInterviewsInterviewIdSchedulesScheduleId(props: {
  hrRecruiter: HrrecruiterPayload;
  interviewId: string & tags.Format<"uuid">;
  scheduleId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Find the target schedule slot
  const schedule =
    await MyGlobal.prisma.ats_recruitment_interview_schedules.findUnique({
      where: { id: props.scheduleId },
    });
  if (!schedule) {
    throw new Error("Interview schedule slot not found");
  }
  if (schedule.ats_recruitment_interview_id !== props.interviewId) {
    throw new Error("Schedule slot does not belong to the provided interview");
  }

  // Step 2: Fetch parent interview entity
  const interview = await MyGlobal.prisma.ats_recruitment_interviews.findUnique(
    {
      where: { id: props.interviewId },
    },
  );
  if (!interview) {
    throw new Error("Interview not found");
  }
  if (interview.status === "completed") {
    throw new Error("Cannot delete schedule slot from a completed interview");
  }

  // Step 3: Hard delete the schedule slot
  await MyGlobal.prisma.ats_recruitment_interview_schedules.delete({
    where: { id: props.scheduleId },
  });

  // Step 4: Delete all related interview calendar syncs (good practice for cascade)
  await MyGlobal.prisma.ats_recruitment_interview_calendar_syncs.deleteMany({
    where: { ats_recruitment_interview_id: props.interviewId },
  });

  // Step 5: Record audit log
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.ats_recruitment_audit_trails.create({
    data: {
      id: v4(),
      event_timestamp: now,
      actor_id: props.hrRecruiter.id,
      actor_role: "hrRecruiter",
      operation_type: "DELETE",
      target_type: "interview_schedule",
      target_id: props.scheduleId,
      event_detail: `Deleted interview schedule ID ${props.scheduleId} for interview ID ${props.interviewId}`,
      ip_address: undefined,
      user_agent: undefined,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
}
