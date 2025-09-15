import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentJobSkill } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobSkill";
import { HrrecruiterPayload } from "../decorators/payload/HrrecruiterPayload";

/**
 * Create a new job skill for recruitment postings (ats_recruitment_job_skills
 * table).
 *
 * This operation allows HR recruiters and system administrators to add a new
 * job skill (technology or keyword) to the database, ensuring the name is
 * unique. The skill will be available for association with job postings and
 * candidate matching. All creations are subject to audit trail.
 *
 * @param props - Function props containing:
 *
 *   - HrRecruiter: The authenticated HR recruiter creating the skill
 *   - Body: The data for the new job skill (name, description, is_active)
 *
 * @returns The newly created job skill entity with audit fields and metadata.
 * @throws {Error} When a skill with the same name already exists.
 */
export async function postatsRecruitmentHrRecruiterJobSkills(props: {
  hrRecruiter: HrrecruiterPayload;
  body: IAtsRecruitmentJobSkill.ICreate;
}): Promise<IAtsRecruitmentJobSkill> {
  const { body } = props;

  // 1. Uniqueness check: Ensure no existing skill with this name
  const existing = await MyGlobal.prisma.ats_recruitment_job_skills.findUnique({
    where: { name: body.name },
  });
  if (existing) {
    throw new Error("A job skill with this name already exists.");
  }

  // 2. Generate required metadata
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const uuid: string & tags.Format<"uuid"> = v4();

  // 3. Create new skill
  const created = await MyGlobal.prisma.ats_recruitment_job_skills.create({
    data: {
      id: uuid,
      name: body.name,
      description: body.description ?? undefined,
      is_active: body.is_active,
      created_at: now,
      updated_at: now,
    },
  });

  // 4. Return type matches IAtsRecruitmentJobSkill exactly (handling date and null/undefined fields)
  return {
    id: created.id,
    name: created.name,
    description: created.description ?? undefined,
    is_active: created.is_active,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at !== null && created.deleted_at !== undefined
        ? toISOStringSafe(created.deleted_at)
        : undefined,
  };
}
