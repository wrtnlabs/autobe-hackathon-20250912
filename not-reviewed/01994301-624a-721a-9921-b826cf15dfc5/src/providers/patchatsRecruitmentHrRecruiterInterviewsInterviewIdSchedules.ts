import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentInterviewSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterviewSchedule";
import { IPageIAtsRecruitmentInterviewSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentInterviewSchedule";
import { HrrecruiterPayload } from "../decorators/payload/HrrecruiterPayload";

/**
 * Search and retrieve a paginated list of interview schedule slots by interview
 * (ats_recruitment_interview_schedules).
 *
 * This endpoint provides advanced filtering and pagination for interview
 * scheduler slots. HR recruiters can use this to view all available, confirmed,
 * canceled, or rescheduled slots for an interview, filter by timezone or
 * status, and export lists for coordination and integration.
 *
 * Authorization: Caller must be an authenticated and valid HR recruiter. System
 * ensures proper permissions by validating the HR recruiter exists and is
 * active.
 *
 * @param props - Object containing request details
 * @param props.hrRecruiter - The authenticated HR recruiter making the request
 *   (authorization enforced at route layer)
 * @param props.interviewId - Target interview's unique identifier (UUID)
 * @param props.body - Search/filter request body, parameters as in
 *   IAtsRecruitmentInterviewSchedule.IRequest
 * @returns Paginated and transformed interview schedule slot list for the given
 *   interview.
 * @throws {Error} If the specified interview does not exist or user is
 *   unauthorized.
 */
export async function patchatsRecruitmentHrRecruiterInterviewsInterviewIdSchedules(props: {
  hrRecruiter: HrrecruiterPayload;
  interviewId: string & tags.Format<"uuid">;
  body: IAtsRecruitmentInterviewSchedule.IRequest;
}): Promise<IPageIAtsRecruitmentInterviewSchedule> {
  const { interviewId, body } = props;

  // Paging logic
  const page = typeof body.page === "number" && body.page >= 1 ? body.page : 1;
  const limit =
    typeof body.limit === "number" && body.limit >= 1 ? body.limit : 20;
  const skip = (page - 1) * limit;

  // Allowed sort fields in schema
  const allowedSort: ReadonlyArray<string> = [
    "start_at",
    "end_at",
    "created_at",
    "updated_at",
    "schedule_status",
  ];
  const sortField =
    typeof body.sort === "string" && allowedSort.includes(body.sort)
      ? body.sort
      : "start_at";
  const sortOrder = body.order === "DESC" ? "desc" : "asc";

  // Interview must exist
  const interview = await MyGlobal.prisma.ats_recruitment_interviews.findUnique(
    {
      where: { id: interviewId },
      select: { id: true },
    },
  );
  if (!interview) throw new Error("Interview not found");

  // Filter conditions (inline, never create intermediate variables)
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ats_recruitment_interview_schedules.findMany({
      where: {
        ats_recruitment_interview_id: interviewId,
        ...(body.schedule_status !== undefined &&
          body.schedule_status !== null && {
            schedule_status: body.schedule_status,
          }),
        ...(body.timezone !== undefined &&
          body.timezone !== null && {
            timezone: body.timezone,
          }),
      },
      orderBy: { [sortField]: sortOrder },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.ats_recruitment_interview_schedules.count({
      where: {
        ats_recruitment_interview_id: interviewId,
        ...(body.schedule_status !== undefined &&
          body.schedule_status !== null && {
            schedule_status: body.schedule_status,
          }),
        ...(body.timezone !== undefined &&
          body.timezone !== null && {
            timezone: body.timezone,
          }),
      },
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map((row) => ({
      id: row.id,
      ats_recruitment_interview_id: row.ats_recruitment_interview_id,
      start_at: toISOStringSafe(row.start_at),
      end_at: toISOStringSafe(row.end_at),
      timezone: row.timezone,
      schedule_source: row.schedule_source,
      schedule_status: row.schedule_status,
      cancellation_reason:
        row.cancellation_reason !== undefined &&
        row.cancellation_reason !== null
          ? row.cancellation_reason
          : undefined,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
    })),
  };
}
