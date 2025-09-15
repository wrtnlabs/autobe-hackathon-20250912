import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentInterviewSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterviewSchedule";
import { HrrecruiterPayload } from "../decorators/payload/HrrecruiterPayload";

/**
 * Update scheduling details of a specific interview schedule slot by
 * interviewId and scheduleId.
 *
 * This operation updates a specific interview schedule within the ATS,
 * supporting changes to time, timezone, source, status, and cancellation
 * reason. The function enforces no-overlap business rules and ensures only
 * valid schedules are modifiable. Schedule updates are not allowed for
 * completed interviews.
 *
 * Authorization: Only HR recruiters (hrRecruiter role) may perform this
 * operation; validation must be strict.
 *
 * Upon updating, the system sets the updated_at timestamp and ensures all
 * date-time fields are formatted correctly. Any change triggers additional
 * notification/sync flows handled elsewhere. Errors are thrown for
 * missing/locked schedules, overlap violations, or incorrect requests.
 *
 * @param props - Contains authenticated HR recruiter, parent interview UUID,
 *   schedule UUID, and update body.
 * @param props.hrRecruiter - The authenticated HR recruiter performing the
 *   update
 * @param props.interviewId - UUID of the parent interview for the schedule slot
 * @param props.scheduleId - UUID of the interview schedule slot to update
 * @param props.body - Fields to update for the schedule slot; may include
 *   start/end time, timezone, etc.
 * @returns The updated interview schedule slot record after successful
 *   modification
 * @throws {Error} If schedule or interview do not exist, if interview is
 *   completed, or if new schedule times overlap another slot
 */
export async function putatsRecruitmentHrRecruiterInterviewsInterviewIdSchedulesScheduleId(props: {
  hrRecruiter: HrrecruiterPayload;
  interviewId: string & tags.Format<"uuid">;
  scheduleId: string & tags.Format<"uuid">;
  body: IAtsRecruitmentInterviewSchedule.IUpdate;
}): Promise<IAtsRecruitmentInterviewSchedule> {
  const { hrRecruiter, interviewId, scheduleId, body } = props;

  // Fetch current schedule and validate parent
  const schedule =
    await MyGlobal.prisma.ats_recruitment_interview_schedules.findUnique({
      where: { id: scheduleId },
    });
  if (!schedule || schedule.ats_recruitment_interview_id !== interviewId) {
    throw new Error("Interview schedule not found for specified interview");
  }

  // Fetch parent interview and enforce modifiability
  const interview = await MyGlobal.prisma.ats_recruitment_interviews.findUnique(
    {
      where: { id: interviewId },
    },
  );
  if (!interview) throw new Error("Parent interview not found");
  if (interview.status === "completed") {
    throw new Error(
      "Interview is completed and cannot accept schedule modification",
    );
  }

  // Check for overlap if times are changing
  const checkStart: string & tags.Format<"date-time"> =
    body.start_at !== undefined
      ? body.start_at
      : toISOStringSafe(schedule.start_at);
  const checkEnd: string & tags.Format<"date-time"> =
    body.end_at !== undefined ? body.end_at : toISOStringSafe(schedule.end_at);
  if (body.start_at !== undefined || body.end_at !== undefined) {
    const overlap =
      await MyGlobal.prisma.ats_recruitment_interview_schedules.findFirst({
        where: {
          ats_recruitment_interview_id: interviewId,
          id: { not: scheduleId },
          start_at: { lt: checkEnd },
          end_at: { gt: checkStart },
        },
      });
    if (overlap)
      throw new Error("Schedule overlaps another slot for this interview");
  }

  // Compute update fields without using Date anywhere
  const newUpdatedAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );
  const updated =
    await MyGlobal.prisma.ats_recruitment_interview_schedules.update({
      where: { id: scheduleId },
      data: {
        start_at: body.start_at ?? undefined,
        end_at: body.end_at ?? undefined,
        timezone: body.timezone ?? undefined,
        schedule_source: body.schedule_source ?? undefined,
        schedule_status: body.schedule_status ?? undefined,
        cancellation_reason: body.cancellation_reason ?? undefined,
        updated_at: newUpdatedAt,
      },
    });

  return {
    id: updated.id,
    ats_recruitment_interview_id: updated.ats_recruitment_interview_id,
    start_at: toISOStringSafe(updated.start_at),
    end_at: toISOStringSafe(updated.end_at),
    timezone: updated.timezone,
    schedule_source: updated.schedule_source,
    schedule_status: updated.schedule_status,
    cancellation_reason: updated.cancellation_reason ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
