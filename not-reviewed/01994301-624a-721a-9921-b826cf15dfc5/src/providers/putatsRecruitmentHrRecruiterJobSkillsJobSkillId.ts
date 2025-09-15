import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentJobSkill } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobSkill";
import { HrrecruiterPayload } from "../decorators/payload/HrrecruiterPayload";

/**
 * Update the details of a specific job skill (ats_recruitment_job_skills
 * table).
 *
 * Enables authorized HR recruiters and system administrators to update existing
 * job skills. Supported fields for update include: name, description, and
 * activation status. Enforces name uniqueness (case-sensitive) and prevents
 * updates to deleted skills. Throws errors for missing fields, ineffective
 * changes, or duplicate names.
 *
 * @param props -
 *
 *   - HrRecruiter: HrrecruiterPayload; // The authenticated HR recruiter making the
 *       request
 *   - JobSkillId: string & tags.Format<'uuid'>; // Unique identifier of the skill
 *       to update
 *   - Body: IAtsRecruitmentJobSkill.IUpdate; // The update payload (at least one
 *       provided)
 *
 * @returns The updated IAtsRecruitmentJobSkill entity with all fields in
 *   ISO-8601 format.
 * @throws Error if the skill does not exist, is deleted, or if name is
 *   duplicate or invalid.
 */
export async function putatsRecruitmentHrRecruiterJobSkillsJobSkillId(props: {
  hrRecruiter: HrrecruiterPayload;
  jobSkillId: string & tags.Format<"uuid">;
  body: IAtsRecruitmentJobSkill.IUpdate;
}): Promise<IAtsRecruitmentJobSkill> {
  const { jobSkillId, body } = props;

  // Check at least one updatable field is present.
  const hasName = typeof body.name === "string";
  const hasDescription = "description" in body;
  const hasIsActive = typeof body.is_active === "boolean";
  if (!hasName && !hasDescription && !hasIsActive) {
    throw new Error(
      "No update field provided: specify at least one of name, description, is_active.",
    );
  }

  // If name is provided, must not be empty string
  if (hasName && body.name.trim() === "") {
    throw new Error("Job skill name cannot be empty.");
  }

  // Fetch current job skill, only if active (deleted_at is null)
  const existing = await MyGlobal.prisma.ats_recruitment_job_skills.findFirst({
    where: { id: jobSkillId, deleted_at: null },
  });
  if (!existing) {
    throw new Error("Job skill not found or was deleted.");
  }

  // If changing name, enforce uniqueness (exclude self)
  if (hasName && body.name !== existing.name) {
    const duplicate =
      await MyGlobal.prisma.ats_recruitment_job_skills.findFirst({
        where: {
          name: body.name,
          deleted_at: null,
          id: { not: jobSkillId },
        },
      });
    if (duplicate) {
      throw new Error("Duplicate skill name exists; name must be unique.");
    }
  }

  // Prepare update fields inline (no intermediate variable)
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.ats_recruitment_job_skills.update({
    where: { id: jobSkillId },
    data: {
      ...(hasName ? { name: body.name } : {}),
      ...(hasDescription ? { description: body.description } : {}),
      ...(hasIsActive ? { is_active: body.is_active } : {}),
      updated_at: now,
    },
  });

  return {
    id: updated.id,
    name: updated.name,
    description:
      typeof updated.description === "string"
        ? updated.description
        : updated.description === null
          ? null
          : undefined,
    is_active: updated.is_active,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
