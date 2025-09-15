import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentInterviewCalendarSync } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterviewCalendarSync";
import { IPageIAtsRecruitmentInterviewCalendarSync } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentInterviewCalendarSync";
import { HrrecruiterPayload } from "../decorators/payload/HrrecruiterPayload";

/**
 * Retrieve a paginated list of all calendar sync attempts for a specific
 * interview (ats_recruitment_interview_calendar_syncs).
 *
 * This endpoint allows an authenticated HR recruiter to audit, review, and
 * troubleshoot external calendar synchronization attempts for a particular
 * interview. Access is strictly limited to the HR recruiter who owns the
 * interview. You can filter and paginate by sync status, sync type, and
 * created_at ranges.
 *
 * @param props - Request properties
 * @param props.hrRecruiter - The authenticated HR recruiter performing the
 *   query (must own the interview)
 * @param props.interviewId - Unique identifier of the interview being queried
 * @param props.body - Filter and pagination parameters
 * @returns A paginated list of calendar sync records for the specified
 *   interview
 * @throws {Error} If the interview does not exist, is deleted, or not owned by
 *   the authenticated HR recruiter
 */
export async function patchatsRecruitmentHrRecruiterInterviewsInterviewIdCalendarSyncs(props: {
  hrRecruiter: HrrecruiterPayload;
  interviewId: string & tags.Format<"uuid">;
  body: IAtsRecruitmentInterviewCalendarSync.IRequest;
}): Promise<IPageIAtsRecruitmentInterviewCalendarSync> {
  // --- 1. Ownership/auth check: Fetch interview and application to confirm HR recruiter owns interview ---
  // Interview => get application_id, then application.hr_recruiter_id must match
  const interview = await MyGlobal.prisma.ats_recruitment_interviews.findFirst({
    where: { id: props.interviewId, deleted_at: null },
    select: { ats_recruitment_application_id: true },
  });
  if (!interview) throw new Error("Interview not found");
  const application =
    await MyGlobal.prisma.ats_recruitment_applications.findFirst({
      where: { id: interview.ats_recruitment_application_id, deleted_at: null },
      select: { job_posting_id: true },
    });
  if (!application) throw new Error("Interview's application not found");
  // Get job posting and confirm its HR recruiter matches which is strictest check: job_postings.hr_recruiter_id === hrRecruiter.id
  const jobPosting =
    await MyGlobal.prisma.ats_recruitment_job_postings.findFirst({
      where: { id: application.job_posting_id, deleted_at: null },
      select: { hr_recruiter_id: true },
    });
  if (!jobPosting || jobPosting.hr_recruiter_id !== props.hrRecruiter.id) {
    throw new Error(
      "You are not authorized to view this interview's calendar syncs.",
    );
  }
  // --- 2. Pagination and filters setup ---
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  const filters = {
    ats_recruitment_interview_id: props.interviewId,
    deleted_at: null,
    ...(props.body.sync_status !== undefined &&
      props.body.sync_status !== null && {
        sync_status: props.body.sync_status,
      }),
    ...(props.body.sync_type !== undefined &&
      props.body.sync_type !== null && { sync_type: props.body.sync_type }),
    ...((props.body.from_created_at !== undefined &&
      props.body.from_created_at !== null) ||
    (props.body.to_created_at !== undefined &&
      props.body.to_created_at !== null)
      ? {
          created_at: {
            ...(props.body.from_created_at !== undefined &&
              props.body.from_created_at !== null && {
                gte: props.body.from_created_at,
              }),
            ...(props.body.to_created_at !== undefined &&
              props.body.to_created_at !== null && {
                lte: props.body.to_created_at,
              }),
          },
        }
      : {}),
  };
  // --- 3. Query and count ---
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ats_recruitment_interview_calendar_syncs.findMany({
      where: filters,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.ats_recruitment_interview_calendar_syncs.count({
      where: filters,
    }),
  ]);
  // --- 4. Map result rows to DTO ---
  const data = rows.map((row) => ({
    id: row.id,
    ats_recruitment_interview_id: row.ats_recruitment_interview_id,
    sync_type: row.sync_type,
    sync_time: toISOStringSafe(row.sync_time),
    sync_status: row.sync_status,
    external_event_id:
      row.external_event_id === null ? undefined : row.external_event_id,
    sync_token: row.sync_token === null ? undefined : row.sync_token,
    error_message: row.error_message === null ? undefined : row.error_message,
    created_at: toISOStringSafe(row.created_at),
  }));
  // --- 5. Return paginated result ---
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
