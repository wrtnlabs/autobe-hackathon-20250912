import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentJobSkill } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobSkill";
import { HrrecruiterPayload } from "../decorators/payload/HrrecruiterPayload";

/**
 * Get detailed information about a specific job skill
 * (ats_recruitment_job_skills table).
 *
 * This operation retrieves all fields for a single job skill entity from the
 * ats_recruitment_job_skills table, as referenced by its jobSkillId path
 * parameter. The record includes the skill name, full description, activation
 * status, creation and update timestamps, and any notes. Only HR and system
 * administrators are allowed access. Throws a 404 error if the skill does not
 * exist or was soft-deleted.
 *
 * @param props - Properties for the operation
 * @param props.hrRecruiter - The authenticated HR recruiter requesting the job
 *   skill details
 * @param props.jobSkillId - UUID identifying the job skill to retrieve
 * @returns The job skill entity matching the requested id
 * @throws {Error} If the job skill does not exist or has been deleted (404
 *   error semantics)
 */
export async function getatsRecruitmentHrRecruiterJobSkillsJobSkillId(props: {
  hrRecruiter: HrrecruiterPayload;
  jobSkillId: string & tags.Format<"uuid">;
}): Promise<IAtsRecruitmentJobSkill> {
  const { jobSkillId } = props;
  const skill = await MyGlobal.prisma.ats_recruitment_job_skills.findFirst({
    where: { id: jobSkillId, deleted_at: null },
  });
  if (!skill) throw new Error("Job skill not found");
  return {
    id: skill.id,
    name: skill.name,
    description: skill.description ?? undefined,
    is_active: skill.is_active,
    created_at: toISOStringSafe(skill.created_at),
    updated_at: toISOStringSafe(skill.updated_at),
    deleted_at: skill.deleted_at
      ? toISOStringSafe(skill.deleted_at)
      : undefined,
  };
}
