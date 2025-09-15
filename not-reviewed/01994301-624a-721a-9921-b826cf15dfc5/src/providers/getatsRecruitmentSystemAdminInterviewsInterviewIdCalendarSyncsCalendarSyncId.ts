import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentInterviewCalendarSync } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterviewCalendarSync";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Fetch detailed information on a specific interview calendar sync record
 * (ats_recruitment_interview_calendar_syncs).
 *
 * This endpoint retrieves the full record of a specific calendar sync attempt
 * associated with an interview, including sync type, timestamp, status,
 * external event identifier, access token fragment, and error messages, if any.
 * Used by system administrators for audit, compliance, and troubleshooting of
 * integration issues with external calendars. Only authenticated system admins
 * may access these records.
 *
 * @param props - Object containing call parameters
 * @param props.systemAdmin - Authenticated system admin user performing the
 *   operation (SystemadminPayload)
 * @param props.interviewId - UUID of the interview to which this calendar sync
 *   event is attached
 * @param props.calendarSyncId - UUID of the calendar sync event
 * @returns IAtsRecruitmentInterviewCalendarSync - Complete detail record for
 *   the calendar sync event
 * @throws {Error} If no matching calendar sync event found for the given
 *   interview and calendarSyncId
 */
export async function getatsRecruitmentSystemAdminInterviewsInterviewIdCalendarSyncsCalendarSyncId(props: {
  systemAdmin: SystemadminPayload;
  interviewId: string & tags.Format<"uuid">;
  calendarSyncId: string & tags.Format<"uuid">;
}): Promise<IAtsRecruitmentInterviewCalendarSync> {
  const record =
    await MyGlobal.prisma.ats_recruitment_interview_calendar_syncs.findFirst({
      where: {
        id: props.calendarSyncId,
        ats_recruitment_interview_id: props.interviewId,
      },
    });
  if (!record) {
    throw new Error("Interview calendar sync not found");
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
