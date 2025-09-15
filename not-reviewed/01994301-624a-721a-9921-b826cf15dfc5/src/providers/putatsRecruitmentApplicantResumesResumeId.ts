import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentResume } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentResume";
import { ApplicantPayload } from "../decorators/payload/ApplicantPayload";

/**
 * Update fields and metadata on an existing applicant’s resume
 * (ats_recruitment_resumes).
 *
 * This operation allows authenticated applicants to update editable metadata
 * (such as title, parsed structure) on their own registered resume. Only
 * active, undeleted, and applicant-owned resumes can be updated. All changes
 * are tracked and subject to audit.
 *
 * @param props - Request properties
 * @param props.applicant - The authenticated applicant making the request (must
 *   own the resume)
 * @param props.resumeId - Unique identifier of the resume to update
 * @param props.body - Structured update fields (title, parsed fields, skills,
 *   etc.)
 * @returns The updated resume record reflecting all changes
 * @throws {Error} When the resume does not exist, is deleted, or does not
 *   belong to this applicant
 */
export async function putatsRecruitmentApplicantResumesResumeId(props: {
  applicant: ApplicantPayload;
  resumeId: string & tags.Format<"uuid">;
  body: IAtsRecruitmentResume.IUpdate;
}): Promise<IAtsRecruitmentResume> {
  const { applicant, resumeId, body } = props;

  // Fetch the resume: must exist, must be owned by applicant, and not soft-deleted
  const resume = await MyGlobal.prisma.ats_recruitment_resumes.findFirst({
    where: {
      id: resumeId,
      ats_recruitment_applicant_id: applicant.id,
      deleted_at: null,
    },
  });
  if (!resume) {
    throw new Error("Resume not found or not owned by applicant");
  }

  // Prepare immutable update with only fields present in body (undefined skips update)
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.ats_recruitment_resumes.update({
    where: { id: resumeId },
    data: {
      title: body.title ?? undefined,
      parsed_name: body.parsed_name ?? undefined,
      parsed_email: body.parsed_email ?? undefined,
      parsed_mobile: body.parsed_mobile ?? undefined,
      parsed_birthdate: body.parsed_birthdate ?? undefined,
      parsed_education_summary: body.parsed_education_summary ?? undefined,
      parsed_experience_summary: body.parsed_experience_summary ?? undefined,
      skills_json: body.skills_json ?? undefined,
      updated_at: now,
    },
  });

  // Map returned fields to API contract: date strings only, optional fields per DTO rules
  return {
    id: updated.id,
    ats_recruitment_applicant_id: updated.ats_recruitment_applicant_id,
    title: updated.title,
    parsed_name: updated.parsed_name ?? undefined,
    parsed_email: updated.parsed_email ?? undefined,
    parsed_mobile: updated.parsed_mobile ?? undefined,
    parsed_birthdate: updated.parsed_birthdate ?? undefined,
    parsed_education_summary: updated.parsed_education_summary ?? undefined,
    parsed_experience_summary: updated.parsed_experience_summary ?? undefined,
    skills_json: updated.skills_json ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
