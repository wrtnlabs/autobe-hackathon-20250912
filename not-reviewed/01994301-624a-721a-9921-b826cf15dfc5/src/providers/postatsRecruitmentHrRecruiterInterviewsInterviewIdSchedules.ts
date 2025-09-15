import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentInterviewSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterviewSchedule";
import { HrrecruiterPayload } from "../decorators/payload/HrrecruiterPayload";

/**
 * Create a new interview schedule slot in ats_recruitment_interview_schedules
 * for specified interview.
 *
 * This operation creates a new interview schedule record for a given interview.
 * It validates that the new schedule does not overlap with existing confirmed
 * or proposed slots for the same interview and that the time range is valid.
 * Only authenticated HR recruiter users may call this endpoint. The slot
 * includes start/end UTC time, timezone, status/source, and optional
 * cancellation reason. Audit fields (created_at/updated_at) are set to now.
 * Errors include invalid time range and slot overlap (conflict), with
 * appropriate error messages.
 *
 * @param props - Object containing required fields
 * @param props.hrRecruiter - Authenticated HR recruiter (authorization enforced
 *   by decorator)
 * @param props.interviewId - UUID of the parent interview
 * @param props.body - Request payload, IAtsRecruitmentInterviewSchedule.ICreate
 * @returns Newly created interview schedule slot object
 *   (IAtsRecruitmentInterviewSchedule)
 * @throws {Error} If time range is invalid or schedule slot overlaps with
 *   existing slot
 */
export async function postatsRecruitmentHrRecruiterInterviewsInterviewIdSchedules(props: {
  hrRecruiter: HrrecruiterPayload;
  interviewId: string & tags.Format<"uuid">;
  body: IAtsRecruitmentInterviewSchedule.ICreate;
}): Promise<IAtsRecruitmentInterviewSchedule> {
  const { interviewId, body } = props;

  // Time range validation: start must be before end
  if (body.end_at <= body.start_at) {
    throw new Error("Schedule end_at must be after start_at");
  }

  // Overlap validation: must not overlap with any confirmed or proposed slot for this interview
  const overlap =
    await MyGlobal.prisma.ats_recruitment_interview_schedules.findFirst({
      where: {
        ats_recruitment_interview_id: interviewId,
        schedule_status: { in: ["confirmed", "proposed"] },
        start_at: { lt: body.end_at },
        end_at: { gt: body.start_at },
      },
    });

  if (overlap) {
    throw new Error(
      "Time slot overlaps with existing confirmed or proposed schedule",
    );
  }

  // Generate field values (id, created/updated)
  const now = toISOStringSafe(new Date());
  const idValue = v4();

  // Write schedule
  const created =
    await MyGlobal.prisma.ats_recruitment_interview_schedules.create({
      data: {
        id: idValue,
        ats_recruitment_interview_id: interviewId,
        start_at: body.start_at,
        end_at: body.end_at,
        timezone: body.timezone,
        schedule_source: body.schedule_source,
        schedule_status: body.schedule_status,
        cancellation_reason: body.cancellation_reason ?? undefined,
        created_at: now,
        updated_at: now,
      },
    });

  // Response - all date values normalized
  return {
    id: created.id,
    ats_recruitment_interview_id: created.ats_recruitment_interview_id,
    start_at: toISOStringSafe(created.start_at),
    end_at: toISOStringSafe(created.end_at),
    timezone: created.timezone,
    schedule_source: created.schedule_source,
    schedule_status: created.schedule_status,
    ...(created.cancellation_reason !== null &&
    typeof created.cancellation_reason === "string"
      ? { cancellation_reason: created.cancellation_reason }
      : {}),
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
