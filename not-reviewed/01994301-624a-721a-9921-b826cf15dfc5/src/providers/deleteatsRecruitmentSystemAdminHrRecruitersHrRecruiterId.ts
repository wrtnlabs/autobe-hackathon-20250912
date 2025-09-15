import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Permanently remove an HR recruiter account from ats_recruitment_hrrecruiters
 * table.
 *
 * This endpoint allows a system administrator to permanently remove an HR
 * recruiter user account from the platform. It is intended for compliance,
 * account separation, or administrative clean-up purposes, and directly targets
 * a row in the ats_recruitment_hrrecruiters table by unique recruiter ID.
 *
 * Only administrators with the systemAdmin role may invoke this operation. The
 * action is irreversible and deletes all HR recruiter privileges and access.
 * Associated job postings, feedback, and notification records may be cascaded
 * or nullified per the referential integrity policies defined in the database
 * schema.
 *
 * If the recruiter ID does not correspond to any existing active recruiter, an
 * error is thrown. Audit logging of the event should be considered (not
 * implemented here).
 *
 * @param props - Object containing the authenticated system administrator and
 *   the unique HR recruiter ID to delete
 * @param props.systemAdmin - The authenticated system administrator making the
 *   request
 * @param props.hrRecruiterId - Unique identifier of the HR recruiter to be
 *   deleted
 * @returns Void
 * @throws {Error} If HR recruiter is not found
 */
export async function deleteatsRecruitmentSystemAdminHrRecruitersHrRecruiterId(props: {
  systemAdmin: SystemadminPayload;
  hrRecruiterId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { hrRecruiterId } = props;

  // 1. Verification is already handled at decorator/middleware (systemAdmin guaranteed).
  // 2. Check for existence to provide a clear error for non-existent recruiter
  const recruiter =
    await MyGlobal.prisma.ats_recruitment_hrrecruiters.findUnique({
      where: { id: hrRecruiterId },
    });
  if (!recruiter) {
    throw new Error("HR recruiter not found");
  }
  // 3. Execute hard delete (cascade/relations managed by Prisma schema)
  await MyGlobal.prisma.ats_recruitment_hrrecruiters.delete({
    where: { id: hrRecruiterId },
  });
  // 4. Audit logging could be added here if business requires (not implemented)
}
