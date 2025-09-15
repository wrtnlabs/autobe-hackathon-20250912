import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentInterviewSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterviewSchedule";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Retrieve detailed information for a single interview schedule record
 * corresponding to a specific interview schedule time slot.
 *
 * This operation returns the full details of the schedule, including the
 * start/end times, timezone, status (proposed, confirmed, cancelled),
 * scheduling source, and notes or cancellation reasons if applicable. Access is
 * restricted to authorized participants (applicant, hrRecruiter, techReviewer,
 * or systemAdmin) with a legitimate link to the specified interview, as well as
 * system administrators. System admins may view any schedule without
 * participant linkage. If the record is missing, throw Error.
 *
 * @param props - Object containing all necessary parameters for the operation
 * @param props.systemAdmin - Authenticated system administrator credentials
 * @param props.interviewId - The UUID of the parent interview
 * @param props.scheduleId - The UUID of the schedule slot to retrieve
 * @returns The complete interview schedule slot object
 * @throws {Error} If the schedule slot does not exist (combined ID/interview
 *   relation)
 */
export async function getatsRecruitmentSystemAdminInterviewsInterviewIdSchedulesScheduleId(props: {
  systemAdmin: SystemadminPayload;
  interviewId: string & tags.Format<"uuid">;
  scheduleId: string & tags.Format<"uuid">;
}): Promise<IAtsRecruitmentInterviewSchedule> {
  const { interviewId, scheduleId } = props;
  const schedule =
    await MyGlobal.prisma.ats_recruitment_interview_schedules.findFirst({
      where: {
        id: scheduleId,
        ats_recruitment_interview_id: interviewId,
      },
    });
  if (!schedule) throw new Error("Interview schedule slot not found");
  return {
    id: schedule.id,
    ats_recruitment_interview_id: schedule.ats_recruitment_interview_id,
    start_at: toISOStringSafe(schedule.start_at),
    end_at: toISOStringSafe(schedule.end_at),
    timezone: schedule.timezone,
    schedule_source: schedule.schedule_source,
    schedule_status: schedule.schedule_status,
    // Handle optional+nullable cancellation_reason properly (field always present in Prisma result)
    ...(schedule.cancellation_reason !== undefined
      ? {
          cancellation_reason: schedule.cancellation_reason,
        }
      : {}),
    created_at: toISOStringSafe(schedule.created_at),
    updated_at: toISOStringSafe(schedule.updated_at),
  };
}
