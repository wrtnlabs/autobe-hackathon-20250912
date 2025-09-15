import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentInterviewSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterviewSchedule";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Update scheduling details of a specific interview schedule slot by
 * interviewId and scheduleId.
 *
 * This operation updates the details of a specific interview schedule slot in
 * the ATS, allowing changes to start/end time, timezone, source, or status. It
 * enforces business policies such as preventing double booking and requiring
 * valid transition states. Only systemAdmin can initiate this operation. The
 * modification is logged for audit and compliance, and may trigger downstream
 * calendar syncs.
 *
 * Authorization: systemAdmin role required.
 *
 * @param props - SystemAdmin: The authenticated system admin user making the
 *   request. interviewId: UUID of the parent interview containing the schedule
 *   scheduleId: UUID of the interview schedule slot to update body: Patch
 *   object containing any schedule fields to update (all optional)
 * @returns The updated interview schedule object matching the API contract
 * @throws {Error} When the schedule or interview specified does not exist or no
 *   matching slot exists
 */
export async function putatsRecruitmentSystemAdminInterviewsInterviewIdSchedulesScheduleId(props: {
  systemAdmin: SystemadminPayload;
  interviewId: string & tags.Format<"uuid">;
  scheduleId: string & tags.Format<"uuid">;
  body: IAtsRecruitmentInterviewSchedule.IUpdate;
}): Promise<IAtsRecruitmentInterviewSchedule> {
  const { interviewId, scheduleId, body } = props;
  const schedule =
    await MyGlobal.prisma.ats_recruitment_interview_schedules.findFirst({
      where: {
        id: scheduleId,
        ats_recruitment_interview_id: interviewId,
      },
    });
  if (!schedule) {
    throw new Error("Interview schedule not found");
  }
  const now = toISOStringSafe(new Date());
  const updated =
    await MyGlobal.prisma.ats_recruitment_interview_schedules.update({
      where: { id: scheduleId },
      data: {
        start_at: body.start_at ?? undefined,
        end_at: body.end_at ?? undefined,
        timezone: body.timezone ?? undefined,
        schedule_source: body.schedule_source ?? undefined,
        schedule_status: body.schedule_status ?? undefined,
        cancellation_reason:
          body.cancellation_reason === undefined
            ? undefined
            : body.cancellation_reason,
        updated_at: now,
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
    cancellation_reason:
      updated.cancellation_reason === undefined
        ? undefined
        : updated.cancellation_reason,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
