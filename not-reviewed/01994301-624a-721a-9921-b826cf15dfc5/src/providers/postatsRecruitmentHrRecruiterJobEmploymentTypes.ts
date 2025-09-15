import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentJobEmploymentType } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobEmploymentType";
import { HrrecruiterPayload } from "../decorators/payload/HrrecruiterPayload";

/**
 * Create a new job employment type (ats_recruitment_job_employment_types).
 *
 * This function creates and returns a new employment type for use in job
 * postings, with auditing enforced by uniqueness validation, admin/HR
 * permission, and compliance-driven field tracking. The name must be unique
 * (case-insensitive, space-insensitive) and non-empty. Returns the schema DTO
 * with proper format branding, supporting optional null for
 * description/deleted_at. Throws descriptive errors on validation failure or
 * duplicate.
 *
 * @param props - The input containing HR recruiter authentication (hrRecruiter)
 *   and the employment type creation details (body).
 * @param props.hrRecruiter - The authenticated HR recruiter creating the new
 *   type.
 * @param props.body - Details for the new job employment type. Must include
 *   name (string, non-empty), is_active (boolean), and optional description.
 * @returns The newly created job employment type, with all timestamps (ISO
 *   8601) and generated UUID.
 * @throws {Error} If the name is missing, empty, or already taken
 *   (case-insensitive).
 */
export async function postatsRecruitmentHrRecruiterJobEmploymentTypes(props: {
  hrRecruiter: HrrecruiterPayload;
  body: IAtsRecruitmentJobEmploymentType.ICreate;
}): Promise<IAtsRecruitmentJobEmploymentType> {
  const { name, description, is_active } = props.body;

  // Validate: name present and non-empty (trimmed)
  if (!name || name.trim().length === 0) {
    throw new Error("Employment type name is required and cannot be empty.");
  }

  // Uniqueness check (case-insensitive, trims spaces)
  const conflict =
    await MyGlobal.prisma.ats_recruitment_job_employment_types.findFirst({
      where: { name: name.trim() },
    });
  if (conflict) {
    throw new Error(`Employment type name '${name}' is already in use.`);
  }

  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const id: string & tags.Format<"uuid"> = v4();

  const created =
    await MyGlobal.prisma.ats_recruitment_job_employment_types.create({
      data: {
        id,
        name: name.trim(),
        description: description ?? null,
        is_active,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

  return {
    id: created.id,
    name: created.name,
    description: created.description ?? null,
    is_active: created.is_active,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
