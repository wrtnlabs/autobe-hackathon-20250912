import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentInterview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterview";
import { ApplicantPayload } from "../decorators/payload/ApplicantPayload";

/**
 * Retrieve interview details for a given applicant and interviewId.
 *
 * This endpoint allows an authenticated applicant to access detailed
 * information about a single scheduled or completed interview, identified by
 * its unique interviewId, only if the applicant is a participant (via their job
 * application). It returns the interview's core fields, such as stage, notes,
 * and status.
 *
 * Strictly enforces that the authenticated applicant matches the applicant_id
 * associated with the linked application for this interview. Throws a 404 error
 * if the interview or application is not found, and a 403 Forbidden error if
 * the applicant does not have access rights. All date fields are returned as
 * ISO8601 strings for compatibility.
 *
 * @param props - Object containing ApplicantPayload and the interviewId
 * @param props.applicant - The authenticated applicant making the request
 * @param props.interviewId - The UUID of the interview entity to fetch
 * @returns IAtsRecruitmentInterview - The interview detail if authorized and
 *   found
 * @throws {Error} Interview or application not found (404)
 * @throws {Error} Forbidden: Applicant not authorized to view this interview
 *   (403)
 */
export async function getatsRecruitmentApplicantInterviewsInterviewId(props: {
  applicant: ApplicantPayload;
  interviewId: string & tags.Format<"uuid">;
}): Promise<IAtsRecruitmentInterview> {
  const { applicant, interviewId } = props;

  // Fetch interview
  const interview = await MyGlobal.prisma.ats_recruitment_interviews.findUnique(
    {
      where: { id: interviewId },
    },
  );
  if (!interview) throw new Error("Interview not found");

  // Fetch matching application
  const application =
    await MyGlobal.prisma.ats_recruitment_applications.findUnique({
      where: { id: interview.ats_recruitment_application_id },
    });
  if (!application) throw new Error("Application not found");

  // Authorization: applicant must be participant of this interview
  if (application.applicant_id !== applicant.id) {
    throw new Error("Forbidden: You are not a participant in this interview");
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
