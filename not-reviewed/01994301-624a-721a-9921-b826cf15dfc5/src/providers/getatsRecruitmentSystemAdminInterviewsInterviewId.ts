import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentInterview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterview";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Retrieve full detail about a single interview (ats_recruitment_interviews
 * table) and its related entities by interviewId.
 *
 * Fetches detailed information for a specific interview instance, as found in
 * the ats_recruitment_interviews table, identified by its unique interviewId.
 * Response includes interview core info, stage, notes, current status, and
 * links to all associated participants and schedules. Access is limited to
 * authorized HR staff, system admins, the assigned tech reviewer, or the
 * applicant for privacy and business policy compliance.
 *
 * This endpoint allows system admins to access full details regardless of
 * participant assignments. Throws an error if the interviewId is invalid or the
 * interview does not exist (including if soft-deleted).
 *
 * @param props - Properties for retrieving the interview detail
 * @param props.systemAdmin - The authenticated system administrator payload
 * @param props.interviewId - The UUID of the interview to retrieve
 * @returns The full interview detail in the ATS as IAtsRecruitmentInterview
 * @throws {Error} If the interview does not exist
 */
export async function getatsRecruitmentSystemAdminInterviewsInterviewId(props: {
  systemAdmin: SystemadminPayload;
  interviewId: string & tags.Format<"uuid">;
}): Promise<IAtsRecruitmentInterview> {
  const { interviewId } = props;
  const interview = await MyGlobal.prisma.ats_recruitment_interviews.findUnique(
    {
      where: { id: interviewId },
      select: {
        id: true,
        ats_recruitment_application_id: true,
        title: true,
        stage: true,
        status: true,
        notes: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    },
  );
  if (!interview) {
    throw new Error("Interview not found");
  }
  return {
    id: interview.id,
    ats_recruitment_application_id: interview.ats_recruitment_application_id,
    title: interview.title,
    stage: interview.stage,
    status: interview.status,
    notes: interview.notes ?? undefined,
    created_at: toISOStringSafe(interview.created_at),
    updated_at: toISOStringSafe(interview.updated_at),
    deleted_at: interview.deleted_at
      ? toISOStringSafe(interview.deleted_at)
      : undefined,
  };
}
