import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentInterviewCalendarSync } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterviewCalendarSync";
import { HrrecruiterPayload } from "../decorators/payload/HrrecruiterPayload";

/**
 * Fetch detailed information on a specific interview calendar sync record
 * (ats_recruitment_interview_calendar_syncs).
 *
 * This endpoint returns the full detail of a single calendar synchronization
 * event for a specific interview. Authorization is enforced: only the HR
 * recruiter who owns the INTERVIEW'S JOB POSTING is allowed to access the
 * record. Properties include sync type, sync time, status, optional external
 * event and token, error messages, and auditing timestamps.
 *
 * @param props - Object containing all required parameters
 * @param props.hrRecruiter - The authenticated HR recruiter making the request
 * @param props.interviewId - The interview's unique identifier
 * @param props.calendarSyncId - The calendar sync event's unique identifier
 * @returns The full detail of the requested interview calendar sync record
 * @throws {Error} If the interview/application/job posting does not exist or is
 *   not owned by recruiter
 * @throws {Error} If the calendar sync record does not exist for the interview
 */
export async function getatsRecruitmentHrRecruiterInterviewsInterviewIdCalendarSyncsCalendarSyncId(props: {
  hrRecruiter: HrrecruiterPayload;
  interviewId: string & tags.Format<"uuid">;
  calendarSyncId: string & tags.Format<"uuid">;
}): Promise<IAtsRecruitmentInterviewCalendarSync> {
  const { hrRecruiter, interviewId, calendarSyncId } = props;

  // Find interview
  const interview = await MyGlobal.prisma.ats_recruitment_interviews.findUnique(
    {
      where: { id: interviewId },
      select: { ats_recruitment_application_id: true },
    },
  );
  if (!interview) {
    throw new Error("Interview not found");
  }

  // Find application
  const application =
    await MyGlobal.prisma.ats_recruitment_applications.findUnique({
      where: { id: interview.ats_recruitment_application_id },
      select: { job_posting_id: true },
    });
  if (!application) {
    throw new Error("Application for this interview not found");
  }

  // Find job posting
  const jobPosting =
    await MyGlobal.prisma.ats_recruitment_job_postings.findUnique({
      where: { id: application.job_posting_id },
      select: { hr_recruiter_id: true },
    });
  if (!jobPosting) {
    throw new Error("Job posting for this interview's application not found");
  }

  if (jobPosting.hr_recruiter_id !== hrRecruiter.id) {
    throw new Error(
      "Unauthorized: You are not the owner (recruiter) of this posting.",
    );
  }

  // Find calendar sync record (no deleted_at filter, as it does not exist)
  const record =
    await MyGlobal.prisma.ats_recruitment_interview_calendar_syncs.findUnique({
      where: { id: calendarSyncId },
      select: {
        id: true,
        ats_recruitment_interview_id: true,
        sync_type: true,
        sync_time: true,
        sync_status: true,
        external_event_id: true,
        sync_token: true,
        error_message: true,
        created_at: true,
      },
    });
  if (!record || record.ats_recruitment_interview_id !== interviewId) {
    throw new Error(
      "Calendar sync event not found for the specified interview.",
    );
  }

  return {
    id: record.id,
    ats_recruitment_interview_id: record.ats_recruitment_interview_id,
    sync_type: record.sync_type,
    sync_time: toISOStringSafe(record.sync_time),
    sync_status: record.sync_status,
    external_event_id: record.external_event_id ?? undefined,
    sync_token: record.sync_token ?? undefined,
    error_message: record.error_message ?? undefined,
    created_at: toISOStringSafe(record.created_at),
  };
}
