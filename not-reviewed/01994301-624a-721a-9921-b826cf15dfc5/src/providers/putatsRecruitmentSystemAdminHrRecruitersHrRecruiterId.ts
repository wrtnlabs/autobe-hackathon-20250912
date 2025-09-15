import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Update a HR recruiter account's profile and status by id
 * (ats_recruitment_hrrecruiters).
 *
 * This endpoint allows a system administrator to update a HR recruiter profile
 * identified by unique ID. Only mutable business fields (name, department,
 * is_active) may be updated; email and password are NOT changeable here.
 * Attempts to update an HR recruiter that does not exist or was soft-deleted
 * will throw an error. The operation validates that provided name (if given) is
 * not empty. All changes are subject to business rules.
 *
 * @param props - Object containing parameters for update
 * @param props.systemAdmin - The authenticated system administrator
 * @param props.hrRecruiterId - The UUID of the HR recruiter to update
 * @param props.body - The profile update information (only allowed fields are
 *   applied)
 * @returns The updated HR recruiter profile entity (no sensitive credential
 *   fields)
 * @throws {Error} If the HR recruiter does not exist, is deleted, or input is
 *   invalid
 */
export async function putatsRecruitmentSystemAdminHrRecruitersHrRecruiterId(props: {
  systemAdmin: SystemadminPayload;
  hrRecruiterId: string & tags.Format<"uuid">;
  body: IAtsRecruitmentHrRecruiter.IUpdate;
}): Promise<IAtsRecruitmentHrRecruiter> {
  // 1. Fetch the target HR recruiter (must not be soft-deleted)
  const hrRecruiter =
    await MyGlobal.prisma.ats_recruitment_hrrecruiters.findFirst({
      where: {
        id: props.hrRecruiterId,
        deleted_at: null,
      },
    });
  if (!hrRecruiter)
    throw new Error("HR recruiter not found or has been deleted");

  // 2. Validate name (must not be empty string if provided)
  if (props.body.name !== undefined && props.body.name.trim() === "") {
    throw new Error("Name must not be empty");
  }

  // 3. Prepare data for update (ignore email and password_hash, only updatable fields)
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const updateData = {
    ...(props.body.name !== undefined && { name: props.body.name }),
    ...(props.body.department !== undefined && {
      department: props.body.department,
    }),
    ...(props.body.is_active !== undefined && {
      is_active: props.body.is_active,
    }),
    updated_at: now,
  };

  // 4. Update the HR recruiter account
  const updated = await MyGlobal.prisma.ats_recruitment_hrrecruiters.update({
    where: { id: props.hrRecruiterId },
    data: updateData,
  });

  // 5. Map the updated entity to IAtsRecruitmentHrRecruiter
  return {
    id: updated.id,
    email: updated.email,
    name: updated.name,
    department: updated.department ?? undefined,
    is_active: updated.is_active,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
