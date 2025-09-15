import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentJobEmploymentType } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobEmploymentType";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Create a new job employment type (ats_recruitment_job_employment_types).
 *
 * This operation allows a privileged system administrator to add a new
 * employment type to the ATS system, supporting organizational flexibility for
 * different hiring schemes (e.g., freelancer, contract, remote). Inputs include
 * employment type name, description, and activation flag. Ensures uniqueness,
 * full auditability, and strict permission enforcement. Returns the created
 * entity with all identifiers and timestamps. Throws on duplicate name or
 * unauthorized access.
 *
 * @param props - Contains the authenticated system administrator payload and
 *   request body for employment type creation
 * @param props.systemAdmin - The authenticated system administrator performing
 *   the creation (must be of role type 'systemadmin')
 * @param props.body - Employment type creation input: name, description, and
 *   is_active flag
 * @returns The newly-created job employment type entity with all field values
 *   populated
 * @throws {Error} If the user is not a system administrator
 * @throws {Error} If a job employment type name already exists (uniqueness
 *   violation)
 */
export async function postatsRecruitmentSystemAdminJobEmploymentTypes(props: {
  systemAdmin: SystemadminPayload;
  body: IAtsRecruitmentJobEmploymentType.ICreate;
}): Promise<IAtsRecruitmentJobEmploymentType> {
  const { systemAdmin, body } = props;

  // Step 1. Enforce authorization strictly
  if (systemAdmin.type !== "systemadmin") {
    throw new Error(
      "Unauthorized: Only system administrators can create employment types",
    );
  }

  // Step 2. Enforce name uniqueness (case-sensitive, active only)
  const existing =
    await MyGlobal.prisma.ats_recruitment_job_employment_types.findFirst({
      where: {
        name: body.name,
        deleted_at: null,
      },
    });
  if (existing) {
    throw new Error("Job employment type name must be unique");
  }

  // Step 3. Prepare timestamps and id
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const newId: string & tags.Format<"uuid"> = v4() as string &
    tags.Format<"uuid">;

  // Step 4. Create the new employment type
  const created =
    await MyGlobal.prisma.ats_recruitment_job_employment_types.create({
      data: {
        id: newId,
        name: body.name,
        description: body.description ?? null,
        is_active: body.is_active,
        created_at: now,
        updated_at: now,
      },
    });

  // Step 5. Map return DTO, using null for absent optional/nullable values
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
