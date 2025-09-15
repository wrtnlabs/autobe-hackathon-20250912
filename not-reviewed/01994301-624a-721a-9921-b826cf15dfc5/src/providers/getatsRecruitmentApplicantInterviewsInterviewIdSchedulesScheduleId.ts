import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentInterviewSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterviewSchedule";
import { ApplicantPayload } from "../decorators/payload/ApplicantPayload";

/**
 * Retrieve detailed information for a single interview schedule record
 * (applicant access).
 *
 * This operation fetches a specific interview schedule slot for a given
 * interview and schedule ID, returning its complete slot details—start/end
 * times, timezone, scheduling source, status, and potential cancellation
 * reason. Access is permitted only for applicants who are participants of the
 * interview (authorization enforced at DB level). If either the schedule does
 * not exist or the applicant is not a participant, an error is thrown.
 *
 * @param props - Object containing the authenticated applicant, interviewId,
 *   scheduleId
 * @param props.applicant - Authenticated ApplicantPayload from JWT
 * @param props.interviewId - UUID of the target interview
 * @param props.scheduleId - UUID of the specific schedule slot
 * @returns Complete IAtsRecruitmentInterviewSchedule details
 * @throws {Error} If the schedule does not exist or applicant is not a
 *   participant
 */
export async function getatsRecruitmentApplicantInterviewsInterviewIdSchedulesScheduleId(props: {
  applicant: ApplicantPayload;
  interviewId: string & tags.Format<"uuid">;
  scheduleId: string & tags.Format<"uuid">;
}): Promise<IAtsRecruitmentInterviewSchedule> {
  // Fetch the schedule slot by id and interviewId
  const schedule =
    await MyGlobal.prisma.ats_recruitment_interview_schedules.findFirst({
      where: {
        id: props.scheduleId,
        ats_recruitment_interview_id: props.interviewId,
      },
    });
  if (!schedule) {
    throw new Error("Interview schedule not found");
  }

  // Confirm applicant is a participant on this interview
  const participant =
    await MyGlobal.prisma.ats_recruitment_interview_participants.findFirst({
      where: {
        ats_recruitment_interview_id: props.interviewId,
        ats_recruitment_applicant_id: props.applicant.id,
      },
    });
  if (!participant) {
    throw new Error(
      "Applicant not authorized to access this interview schedule.",
    );
  }

  // Return slot details with all datetimes stringified as ISO8601
  return {
    id: schedule.id,
    ats_recruitment_interview_id: schedule.ats_recruitment_interview_id,
    start_at: toISOStringSafe(schedule.start_at),
    end_at: toISOStringSafe(schedule.end_at),
    timezone: schedule.timezone,
    schedule_source: schedule.schedule_source,
    schedule_status: schedule.schedule_status,
    cancellation_reason: schedule.cancellation_reason ?? undefined,
    created_at: toISOStringSafe(schedule.created_at),
    updated_at: toISOStringSafe(schedule.updated_at),
  };
}
