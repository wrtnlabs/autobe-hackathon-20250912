import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentResume } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentResume";
import { ApplicantPayload } from "../decorators/payload/ApplicantPayload";

/**
 * Retrieve detailed information for a specific applicant’s resume
 * (ats_recruitment_resumes) by UUID
 *
 * This operation retrieves the detailed information of a single resume by its
 * unique identifier. Anchored to the ats_recruitment_resumes table, this
 * endpoint allows an authenticated applicant to view all structured and parsed
 * metadata, provided resume ownership and active status are verified.
 *
 * Only the authenticated applicant who owns the resume can access this
 * resource, and system checks are enforced to reject requests for deleted or
 * unauthorized records. The response provides the most up-to-date structured
 * record for the requested resume, supporting compliance and privacy
 * requirements.
 *
 * @param props - The properties required to identify the requesting applicant
 *   and the target resume
 * @param props.applicant - The authenticated applicant making the request
 * @param props.resumeId - The unique identifier (UUID) of the resume to
 *   retrieve
 * @returns IAtsRecruitmentResume – The full, up-to-date resume record, or
 *   throws on authorization/error
 * @throws {Error} If the resume does not exist, is not owned by the applicant,
 *   or has been deleted (privacy enforced)
 */
export async function getatsRecruitmentApplicantResumesResumeId(props: {
  applicant: ApplicantPayload;
  resumeId: string & tags.Format<"uuid">;
}): Promise<IAtsRecruitmentResume> {
  const { applicant, resumeId } = props;

  const resume = await MyGlobal.prisma.ats_recruitment_resumes.findFirst({
    where: {
      id: resumeId,
      ats_recruitment_applicant_id: applicant.id,
      deleted_at: null,
    },
  });
  if (!resume) {
    throw new Error("Resume not found or access denied");
  }

  return {
    id: resume.id,
    ats_recruitment_applicant_id: resume.ats_recruitment_applicant_id,
    title: resume.title,
    parsed_name: resume.parsed_name ?? undefined,
    parsed_email: resume.parsed_email ?? undefined,
    parsed_mobile: resume.parsed_mobile ?? undefined,
    parsed_birthdate: resume.parsed_birthdate ?? undefined,
    parsed_education_summary: resume.parsed_education_summary ?? undefined,
    parsed_experience_summary: resume.parsed_experience_summary ?? undefined,
    skills_json: resume.skills_json ?? undefined,
    created_at: toISOStringSafe(resume.created_at),
    updated_at: toISOStringSafe(resume.updated_at),
    deleted_at:
      resume.deleted_at === null
        ? undefined
        : toISOStringSafe(resume.deleted_at),
  };
}
