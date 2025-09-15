import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Permanently delete a specific interview schedule slot (hard delete).
 *
 * This operation deletes a schedule slot row in
 * ats_recruitment_interview_schedules, identified by interviewId and
 * scheduleId, without soft-deletion. It is used for administrative removal of
 * erroneous slots and is only permitted for system administrators (systemAdmin
 * role). The function ensures the slot exists, removes associated interview
 * calendar syncs, logs an audit event for compliance, and throws errors if the
 * slot does not exist or was already removed. Downstream integrations are
 * cleaned up with the deletion.
 *
 * @param props - Object containing role authentication and unique identifiers
 * @param props.systemAdmin - The authenticated system administrator making the
 *   request
 * @param props.interviewId - The parent interview UUID owning the schedule slot
 *   to delete
 * @param props.scheduleId - The interview schedule slot UUID to delete
 * @returns Void
 * @throws {Error} When the schedule does not exist or is already deleted, or
 *   referenced by critical state.
 */
export async function deleteatsRecruitmentSystemAdminInterviewsInterviewIdSchedulesScheduleId(props: {
  systemAdmin: SystemadminPayload;
  interviewId: string & tags.Format<"uuid">;
  scheduleId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Ensure the slot exists for the given interview.
  const schedule =
    await MyGlobal.prisma.ats_recruitment_interview_schedules.findFirst({
      where: {
        id: props.scheduleId,
        ats_recruitment_interview_id: props.interviewId,
      },
    });
  if (!schedule) {
    throw new Error("Interview schedule slot not found or already removed");
  }

  // 2. Cleanup all calendar syncs tied to the same interview (conservative, since syncs do not reference scheduleId directly).
  await MyGlobal.prisma.ats_recruitment_interview_calendar_syncs.deleteMany({
    where: {
      ats_recruitment_interview_id: props.interviewId,
    },
  });

  // 3. Hard delete the actual schedule slot.
  await MyGlobal.prisma.ats_recruitment_interview_schedules.delete({
    where: {
      id: props.scheduleId,
    },
  });

  // 4. Audit log the deletion event
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.ats_recruitment_audit_trails.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      event_timestamp: now,
      actor_id: props.systemAdmin.id,
      actor_role: "systemadmin",
      operation_type: "DELETE",
      target_type: "interview_schedule_slot",
      target_id: props.scheduleId,
      event_detail: `Deleted schedule slot for interview ${props.interviewId}`,
      created_at: now,
      updated_at: now,
      // deleted_at omitted (nullable)
    },
  });
}
