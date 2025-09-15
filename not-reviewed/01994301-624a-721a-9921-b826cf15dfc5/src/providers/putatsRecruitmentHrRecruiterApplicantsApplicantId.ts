import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentApplicant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicant";
import { HrrecruiterPayload } from "../decorators/payload/HrrecruiterPayload";

/**
 * Update applicant profile detail by applicantId.
 *
 * Updates the applicant profile (name, email, phone, is_active, password) in
 * the ats_recruitment_applicants table. Allows privileged HR recruiters to
 * update any editable applicant fields. Password change is handled securely
 * with hashing. Does NOT permit update of protected or system-managed fields.
 * The operation validates applicant existence and non-deleted status, enforces
 * email uniqueness, and ensures all returned values are correctly formatted.
 *
 * @param props - Object containing HR recruiter authentication, target
 *   applicantId, and update body
 * @param props.hrRecruiter - The authenticated HR recruiter performing the
 *   operation
 * @param props.applicantId - UUID of the applicant to update
 * @param props.body - Update data (partial fields allowed; password is hashed)
 * @returns The full updated applicant profile, including all relevant business
 *   fields
 * @throws {Error} When applicant is not found, is deleted, or email uniqueness
 *   constraint is violated.
 */
export async function putatsRecruitmentHrRecruiterApplicantsApplicantId(props: {
  hrRecruiter: HrrecruiterPayload;
  applicantId: string & tags.Format<"uuid">;
  body: IAtsRecruitmentApplicant.IUpdate;
}): Promise<IAtsRecruitmentApplicant> {
  const { applicantId, body } = props;

  // Fetch applicant by ID, ensure not deleted
  const applicant = await MyGlobal.prisma.ats_recruitment_applicants.findFirst({
    where: {
      id: applicantId,
      deleted_at: null,
    },
  });
  if (!applicant) {
    throw new Error("Applicant not found or has been deleted");
  }

  // Prepare update fields; only include fields that are provided
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const updateData: {
    email?: string & tags.Format<"email">;
    name?: string;
    phone?: string | null;
    is_active?: boolean;
    password_hash?: string;
    updated_at: string & tags.Format<"date-time">;
  } = {
    ...(body.email !== undefined ? { email: body.email } : {}),
    ...(body.name !== undefined ? { name: body.name } : {}),
    ...(body.phone !== undefined ? { phone: body.phone } : {}),
    ...(body.is_active !== undefined ? { is_active: body.is_active } : {}),
    updated_at: now,
  };
  if (body.password !== undefined) {
    updateData.password_hash = await MyGlobal.password.hash(body.password);
  }

  let updated;
  try {
    updated = await MyGlobal.prisma.ats_recruitment_applicants.update({
      where: { id: applicantId },
      data: updateData,
    });
  } catch (err) {
    // Prisma error code for unique constraint violation
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as any).code === "P2002"
    ) {
      throw new Error("Email already exists");
    }
    throw err;
  }

  return {
    id: updated.id,
    email: updated.email,
    name: updated.name,
    phone: updated.phone ?? undefined,
    is_active: updated.is_active,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
