import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import { HrrecruiterPayload } from "../decorators/payload/HrrecruiterPayload";

/**
 * Update a HR recruiter account's profile and status by id
 * (ats_recruitment_hrrecruiters).
 *
 * This operation updates main profile fields for an HR recruiter, such as name,
 * department, and activation status. Only the authenticated HR recruiter can
 * update their own account with this endpoint; system admin update is not
 * included here. Email changes are permitted here but may require separate
 * verification per business policy. Password changes must be performed through
 * a dedicated endpoint. All update events are subject to audit trail logging
 * via system infrastructure.
 *
 * @param props - The update request object
 * @param props.hrRecruiter - Authenticated HR recruiter (must match target id)
 * @param props.hrRecruiterId - The HR recruiter UUID to update
 * @param props.body - Object containing fields to update (name, department,
 *   is_active, email)
 * @returns The updated HR recruiter entity
 * @throws {Error} If attempting to update another recruiter's account or the
 *   account does not exist
 */
export async function putatsRecruitmentHrRecruiterHrRecruitersHrRecruiterId(props: {
  hrRecruiter: HrrecruiterPayload;
  hrRecruiterId: string & tags.Format<"uuid">;
  body: IAtsRecruitmentHrRecruiter.IUpdate;
}): Promise<IAtsRecruitmentHrRecruiter> {
  const { hrRecruiter, hrRecruiterId, body } = props;

  // Authorization: only allow self-update
  if (hrRecruiter.id !== hrRecruiterId) {
    throw new Error("Unauthorized: Cannot update other recruiter's profile");
  }

  // Find the recruiter (active, not deleted)
  const recruiter =
    await MyGlobal.prisma.ats_recruitment_hrrecruiters.findFirst({
      where: {
        id: hrRecruiterId,
        deleted_at: null,
      },
    });
  if (!recruiter) {
    throw new Error("HR recruiter not found");
  }

  // Prepare allowed update fields
  const now = toISOStringSafe(new Date());
  const updateData = {
    ...(body.name !== undefined && { name: body.name }),
    ...(body.department !== undefined && { department: body.department }),
    ...(body.is_active !== undefined && { is_active: body.is_active }),
    ...(body.email !== undefined && { email: body.email }),
    updated_at: now,
  };

  const updated = await MyGlobal.prisma.ats_recruitment_hrrecruiters.update({
    where: { id: hrRecruiterId },
    data: updateData,
  });

  // Format for DTO (convert dates, handle nullable/optionals per contract)
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
