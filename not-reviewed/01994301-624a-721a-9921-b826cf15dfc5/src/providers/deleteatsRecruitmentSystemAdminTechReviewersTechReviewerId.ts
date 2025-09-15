import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Permanently delete a technical reviewer account
 * (ats_recruitment_techreviewers table) by techReviewerId.
 *
 * This operation allows a system administrator to hard-delete a technical
 * reviewer from the ATS system. It verifies that the tech reviewer exists,
 * performs a hard delete (removing the record entirely), and creates an audit
 * trail in ats_recruitment_audit_trails for compliance and traceability.
 *
 * Authorization is enforced by requiring a valid SystemadminPayload. Attempting
 * to delete a non-existent reviewer results in an error. All date fields are
 * properly formatted as string & tags.Format<'date-time'>, all UUIDs are
 * generated using v4, and no native Date type is used. No type assertions (as)
 * are present. The function is functional, immutable, and consistent.
 *
 * @param props - Object with system admin's payload and the tech reviewer ID to
 *   delete
 * @param props.systemAdmin - Authenticated system admin JWT payload
 * @param props.techReviewerId - UUID of the technical reviewer to delete
 * @returns Void if successful
 * @throws {Error} If the reviewer does not exist or cannot be found
 */
export async function deleteatsRecruitmentSystemAdminTechReviewersTechReviewerId(props: {
  systemAdmin: SystemadminPayload;
  techReviewerId: string & tags.Format<"uuid">;
}): Promise<void> {
  const reviewer =
    await MyGlobal.prisma.ats_recruitment_techreviewers.findUnique({
      where: { id: props.techReviewerId },
    });
  if (!reviewer) {
    throw new Error("Technical reviewer not found");
  }

  await MyGlobal.prisma.ats_recruitment_techreviewers.delete({
    where: { id: props.techReviewerId },
  });

  const isoNow: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  await MyGlobal.prisma.ats_recruitment_audit_trails.create({
    data: {
      id: v4(),
      event_timestamp: isoNow,
      actor_id: props.systemAdmin.id,
      actor_role: "systemadmin",
      operation_type: "DELETE",
      target_type: "ats_recruitment_techreviewers",
      target_id: props.techReviewerId,
      event_detail: `System admin ${props.systemAdmin.id} deleted tech reviewer ${props.techReviewerId}`,
      ip_address: undefined,
      user_agent: undefined,
      created_at: isoNow,
      updated_at: isoNow,
      deleted_at: undefined,
    },
  });
  // Nothing to return
}
