import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentApplicant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicant";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Update applicant profile detail by applicantId.
 *
 * Updates the profile information of a specified applicant (by applicantId) in
 * the ats_recruitment_applicants table. Allows changes to all editable
 * applicant fields (name, email, phone, is_active, password via password_hash)
 * as permitted for system administrators. Throws errors for not found,
 * forbidden, duplicate email, or constraint violations. Returns the full,
 * updated applicant profile on success, with strict handling of all type,
 * null/undefined, and date formatting business rules.
 *
 * @param props - Properties for the operation
 * @param props.systemAdmin - Authenticated SystemadminPayload performing the
 *   update
 * @param props.applicantId - The applicantId (UUID) of the applicant to update
 * @param props.body - Fields to update in the IAtsRecruitmentApplicant.IUpdate
 *   format
 * @returns The full updated applicant profile (IAtsRecruitmentApplicant)
 * @throws Error when applicant not found, email duplicate violation, or system
 *   error
 */
export async function putatsRecruitmentSystemAdminApplicantsApplicantId(props: {
  systemAdmin: SystemadminPayload;
  applicantId: string & tags.Format<"uuid">;
  body: IAtsRecruitmentApplicant.IUpdate;
}): Promise<IAtsRecruitmentApplicant> {
  const { applicantId, body } = props;

  // Step 1: Find the applicant (must exist and not deleted)
  const prev = await MyGlobal.prisma.ats_recruitment_applicants.findFirst({
    where: { id: applicantId, deleted_at: null },
  });
  if (!prev) throw new Error("Applicant not found or already deleted");

  // Step 2: Hash new password if provided
  let password_hash: string | undefined;
  if (body.password !== undefined) {
    password_hash = await MyGlobal.password.hash(body.password);
  }

  // Step 3: Update applicant (only allowed fields)
  let updated;
  try {
    updated = await MyGlobal.prisma.ats_recruitment_applicants.update({
      where: { id: applicantId },
      data: {
        email: body.email ?? undefined,
        name: body.name ?? undefined,
        phone: body.phone === undefined ? undefined : body.phone,
        is_active: body.is_active ?? undefined,
        ...(password_hash !== undefined ? { password_hash } : {}),
        updated_at: toISOStringSafe(new Date()),
      },
    });
  } catch (err) {
    // Prisma P2002: Unique constraint failed (e.g., duplicate email)
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as any).code === "P2002" &&
      (err as any).meta &&
      Array.isArray((err as any).meta.target) &&
      (err as any).meta.target.includes("email")
    ) {
      throw new Error("Duplicate email not allowed");
    }
    throw err;
  }

  // Step 4: Build and return the API response strictly matching IAtsRecruitmentApplicant
  return {
    id: updated.id,
    email: updated.email,
    name: updated.name,
    phone:
      updated.phone === null || updated.phone === undefined
        ? null
        : updated.phone,
    is_active: updated.is_active,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null || updated.deleted_at === undefined
        ? null
        : toISOStringSafe(updated.deleted_at),
  };
}
