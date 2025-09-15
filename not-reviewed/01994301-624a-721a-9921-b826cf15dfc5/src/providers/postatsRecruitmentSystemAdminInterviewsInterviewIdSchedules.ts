import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentInterviewSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterviewSchedule";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Create a new interview schedule slot in ats_recruitment_interview_schedules
 * for specified interview.
 *
 * This operation creates a new schedule entry for the given interview, ensuring
 * there are no conflicting time slots. The slot is attached to the interview,
 * audited by timestamps, and supports manual/external scheduling flows (Google
 * Calendar, etc). Only a user with the systemAdmin role may use this endpoint.
 * Overlapping schedule slots or missing interviews are rejected with errors.
 *
 * @param props - Parameters for schedule creation
 * @param props.systemAdmin - The authenticated system admin creating the
 *   schedule
 * @param props.interviewId - UUID of the parent interview
 * @param props.body - Schedule creation parameters (start/end, timezone,
 *   status, etc)
 * @returns The newly created interview schedule slot
 * @throws {Error} Interview not found or has been deleted
 * @throws {Error} Schedule slot time overlaps with an existing
 *   confirmed/proposed slot
 */
export async function postatsRecruitmentSystemAdminInterviewsInterviewIdSchedules(props: {
  systemAdmin: SystemadminPayload;
  interviewId: string & tags.Format<"uuid">;
  body: IAtsRecruitmentInterviewSchedule.ICreate;
}): Promise<IAtsRecruitmentInterviewSchedule> {
  const { systemAdmin, interviewId, body } = props;

  // Authorization is ensured by systemAdmin typing (always present in props)

  // Step 1: Verify parent interview exists and is not deleted
  const interview = await MyGlobal.prisma.ats_recruitment_interviews.findFirst({
    where: {
      id: interviewId,
      deleted_at: null,
    },
  });
  if (!interview) throw new Error("Interview not found or has been deleted");

  // Step 2: Ensure there is no overlap with existing schedule slots (status = confirmed/proposed)
  const overlap =
    await MyGlobal.prisma.ats_recruitment_interview_schedules.findFirst({
      where: {
        ats_recruitment_interview_id: interviewId,
        AND: [
          { start_at: { lt: body.end_at } },
          { end_at: { gt: body.start_at } },
          { schedule_status: { in: ["proposed", "confirmed"] } },
        ],
      },
    });
  if (overlap)
    throw new Error(
      "Schedule slot overlaps with an existing confirmed/proposed slot",
    );

  // Step 3: Current timestamp for audit (both created_at/updated_at)
  const now = toISOStringSafe(new Date());

  // Step 4: Create schedule slot (use inline data definition)
  const created =
    await MyGlobal.prisma.ats_recruitment_interview_schedules.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        ats_recruitment_interview_id: interviewId,
        start_at: toISOStringSafe(body.start_at),
        end_at: toISOStringSafe(body.end_at),
        timezone: body.timezone,
        schedule_source: body.schedule_source,
        schedule_status: body.schedule_status,
        cancellation_reason:
          body.cancellation_reason !== undefined
            ? body.cancellation_reason
            : undefined,
        created_at: now,
        updated_at: now,
      },
    });

  // Step 5: Map result to response shape (all dates converted correctly)
  return {
    id: created.id,
    ats_recruitment_interview_id: created.ats_recruitment_interview_id,
    start_at: toISOStringSafe(created.start_at),
    end_at: toISOStringSafe(created.end_at),
    timezone: created.timezone,
    schedule_source: created.schedule_source,
    schedule_status: created.schedule_status,
    cancellation_reason:
      created.cancellation_reason !== undefined
        ? created.cancellation_reason
        : undefined,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
