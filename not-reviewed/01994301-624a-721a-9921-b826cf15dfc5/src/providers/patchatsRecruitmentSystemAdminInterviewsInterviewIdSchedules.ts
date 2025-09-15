import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentInterviewSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterviewSchedule";
import { IPageIAtsRecruitmentInterviewSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentInterviewSchedule";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Search and retrieve a paginated list of interview schedule slots by interview
 * (ats_recruitment_interview_schedules).
 *
 * This endpoint provides advanced search and paging over interview schedule
 * slots for a specific interview, supporting filters by status, timezone, and a
 * variety of sorting fields. Only accessible to system administrators
 * (systemAdmin) for compliance, calendar sync, and schedule management. The API
 * supports safe default paging, input validation, authorization, and always
 * returns properly typed and formatted result data.
 *
 * @param props - Object with authentication, path parameter, and body:
 *
 *   - SystemAdmin: SystemadminPayload (caller must be systemAdmin)
 *   - InterviewId: The UUID of the parent interview
 *   - Body: IAtsRecruitmentInterviewSchedule.IRequest including filter/sort/page
 *
 * @returns IPageIAtsRecruitmentInterviewSchedule containing matching schedules
 *   and full pagination summary.
 * @throws {Error} If the parent interview does not exist
 * @throws {Error} If unauthorized
 */
export async function patchatsRecruitmentSystemAdminInterviewsInterviewIdSchedules(props: {
  systemAdmin: SystemadminPayload;
  interviewId: string & tags.Format<"uuid">;
  body: IAtsRecruitmentInterviewSchedule.IRequest;
}): Promise<IPageIAtsRecruitmentInterviewSchedule> {
  const { systemAdmin, interviewId, body } = props;

  // (1) Authorization is enforced by decorator. Redundant check here for compliance.
  if (!systemAdmin || systemAdmin.type !== "systemadmin") {
    throw new Error("Unauthorized: Must be systemadmin.");
  }

  // (2) Check interview existence (not soft-deleted, as interview table does support soft delete)
  const interview = await MyGlobal.prisma.ats_recruitment_interviews.findFirst({
    where: {
      id: interviewId,
      deleted_at: null,
    },
  });
  if (!interview) {
    throw new Error("Interview not found");
  }

  // (3) Paging setup
  const page = (
    body.page !== undefined && body.page !== null ? body.page : 1
  ) as number;
  const limit = (
    body.limit !== undefined && body.limit !== null ? body.limit : 20
  ) as number;
  const skip = (page - 1) * limit;

  // (4) Parse sort field and order
  const allowedSortFields = ["start_at", "end_at", "created_at", "updated_at"];
  let sortField =
    body.sort && allowedSortFields.includes(body.sort) ? body.sort : "start_at";
  let sortOrder =
    body.order &&
    typeof body.order === "string" &&
    body.order.toUpperCase() === "ASC"
      ? "asc"
      : "desc";

  // (5) Build where clause (all filter fields must actually exist in the schema)
  const where = {
    ats_recruitment_interview_id: interviewId,
    ...(body.schedule_status !== undefined &&
      body.schedule_status !== null && {
        schedule_status: body.schedule_status,
      }),
    ...(body.timezone !== undefined &&
      body.timezone !== null && {
        timezone: body.timezone,
      }),
  };

  // (6) Run parallel queries for paging
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ats_recruitment_interview_schedules.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.ats_recruitment_interview_schedules.count({ where }),
  ]);

  // (7) Map: Return correct DTO w/ all temporal fields converted and cancellation_reason as specified
  const data: IAtsRecruitmentInterviewSchedule[] = rows.map((row) => ({
    id: row.id,
    ats_recruitment_interview_id: row.ats_recruitment_interview_id,
    start_at: toISOStringSafe(row.start_at),
    end_at: toISOStringSafe(row.end_at),
    timezone: row.timezone,
    schedule_source: row.schedule_source,
    schedule_status: row.schedule_status,
    cancellation_reason: row.cancellation_reason ?? undefined,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
  }));

  // (8) Return
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit) || 1,
    },
    data,
  };
}
