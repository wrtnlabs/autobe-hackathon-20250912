import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentInterviewCalendarSync } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterviewCalendarSync";
import { IPageIAtsRecruitmentInterviewCalendarSync } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentInterviewCalendarSync";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Retrieve a paginated list of all calendar sync attempts for a specific
 * interview in the ATS recruitment platform.
 *
 * This operation enables a system administrator to audit and review external
 * calendar synchronization attempts for an interview. The underlying entity is
 * ats_recruitment_interview_calendar_syncs, logging detailed events, failures,
 * and states.
 *
 * Access is restricted to system administrators. The response contains
 * paginated, filterable event logs for auditing, error tracking, and
 * compliance.
 *
 * @param props -
 * @returns A paged, filterable list of calendar sync attempts with status,
 *   event IDs, timestamps, and any integration errors
 * @throws {Error} If the interview does not exist or has been deleted
 * @field systemAdmin - The authenticated SystemadminPayload for privileged access
 * @field interviewId - The unique UUID of the interview
 * @field body - Filtering and pagination params
 */
export async function patchatsRecruitmentSystemAdminInterviewsInterviewIdCalendarSyncs(props: {
  systemAdmin: SystemadminPayload;
  interviewId: string & tags.Format<"uuid">;
  body: IAtsRecruitmentInterviewCalendarSync.IRequest;
}): Promise<IPageIAtsRecruitmentInterviewCalendarSync> {
  const { interviewId, body } = props;

  // Step 1: Authorization is enforced by controller (systemAdmin required)
  // Step 2: Verify interview exists (not deleted)
  const interview = await MyGlobal.prisma.ats_recruitment_interviews.findFirst({
    where: {
      id: interviewId,
      deleted_at: null,
    },
  });
  if (!interview) {
    throw new Error("Interview not found or has been deleted");
  }

  // Step 3: Pagination and filter setup
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;
  const where = {
    ats_recruitment_interview_id: interviewId,
    deleted_at: null,
    ...(body.sync_status !== undefined &&
      body.sync_status !== null && {
        sync_status: body.sync_status,
      }),
    ...(body.sync_type !== undefined &&
      body.sync_type !== null && {
        sync_type: body.sync_type,
      }),
    ...(((body.from_created_at !== undefined &&
      body.from_created_at !== null) ||
      (body.to_created_at !== undefined && body.to_created_at !== null)) && {
      created_at: {
        ...(body.from_created_at !== undefined &&
          body.from_created_at !== null && {
            gte: body.from_created_at,
          }),
        ...(body.to_created_at !== undefined &&
          body.to_created_at !== null && {
            lte: body.to_created_at,
          }),
      },
    }),
  };

  // Step 4: Query DB in parallel for data and count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ats_recruitment_interview_calendar_syncs.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.ats_recruitment_interview_calendar_syncs.count({ where }),
  ]);

  // Step 5: Map results to API structure with correct date/time handling
  const data = rows.map((row) => ({
    id: row.id,
    ats_recruitment_interview_id: row.ats_recruitment_interview_id,
    sync_type: row.sync_type,
    sync_time: toISOStringSafe(row.sync_time),
    sync_status: row.sync_status,
    external_event_id:
      row.external_event_id === null || row.external_event_id === undefined
        ? undefined
        : row.external_event_id,
    sync_token:
      row.sync_token === null || row.sync_token === undefined
        ? undefined
        : row.sync_token,
    error_message:
      row.error_message === null || row.error_message === undefined
        ? undefined
        : row.error_message,
    created_at: toISOStringSafe(row.created_at),
  }));

  // Step 6: Return with pagination data (use Number() to strip brands)
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data,
  };
}
