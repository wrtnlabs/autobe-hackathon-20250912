import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentResume } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentResume";
import { ApplicantPayload } from "../decorators/payload/ApplicantPayload";

/**
 * Register a new resume for the authenticated applicant by submitting
 * structured data and associated upload metadata.
 *
 * This endpoint allows a job seeker applicant to upload and register a new
 * resume within the ATS system. It stores all structured resume fields in the
 * ats_recruitment_resumes table, requires title, allows optional parsing
 * fields, and enforces JSON validation for the skills_json field. Creation is
 * protected by applicant authentication and creates a secured, compliant data
 * record.
 *
 * @param props.applicant - The authenticated applicant making the request (must
 *   have a valid, active account)
 * @param props.body - Resume creation payload including title, parsed fields,
 *   and skills_json (must be valid JSON if present)
 * @returns The full resume record after successful creation, including all
 *   structured fields (with ISO timestamps)
 * @throws {Error} If skills_json is present and does not contain valid JSON
 */
export async function postatsRecruitmentApplicantResumes(props: {
  applicant: ApplicantPayload;
  body: IAtsRecruitmentResume.ICreate;
}): Promise<IAtsRecruitmentResume> {
  const { applicant, body } = props;
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // Validate that skills_json (if present and not null/undefined) is valid JSON
  if (body.skills_json !== undefined && body.skills_json !== null) {
    try {
      JSON.parse(body.skills_json);
    } catch {
      throw new Error(
        "skills_json must be a valid JSON-encoded string (array or object)",
      );
    }
  }

  const created = await MyGlobal.prisma.ats_recruitment_resumes.create({
    data: {
      id: v4(),
      ats_recruitment_applicant_id: applicant.id,
      title: body.title,
      parsed_name: body.parsed_name ?? null,
      parsed_email: body.parsed_email ?? null,
      parsed_mobile: body.parsed_mobile ?? null,
      parsed_birthdate: body.parsed_birthdate ?? null,
      parsed_education_summary: body.parsed_education_summary ?? null,
      parsed_experience_summary: body.parsed_experience_summary ?? null,
      skills_json: body.skills_json ?? null,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id,
    ats_recruitment_applicant_id: created.ats_recruitment_applicant_id,
    title: created.title,
    parsed_name: created.parsed_name ?? null,
    parsed_email: created.parsed_email ?? null,
    parsed_mobile: created.parsed_mobile ?? null,
    parsed_birthdate: created.parsed_birthdate ?? null,
    parsed_education_summary: created.parsed_education_summary ?? null,
    parsed_experience_summary: created.parsed_experience_summary ?? null,
    skills_json: created.skills_json ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
