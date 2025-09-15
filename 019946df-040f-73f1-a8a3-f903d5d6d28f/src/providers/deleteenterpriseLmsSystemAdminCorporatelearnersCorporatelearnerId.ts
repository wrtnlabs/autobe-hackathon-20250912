import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Permanently delete a corporate learner by unique ID.
 *
 * This operation removes all associated tenant-scoped data and unconditionally
 * deletes the corporate learner record from the database. Only system
 * administrators are authorized to perform this action.
 *
 * @param props - Properties including systemAdmin user and corporate learner
 *   ID.
 * @throws {Error} If the corporate learner does not exist.
 */
export async function deleteenterpriseLmsSystemAdminCorporatelearnersCorporatelearnerId(props: {
  systemAdmin: SystemadminPayload;
  corporatelearnerId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { systemAdmin, corporatelearnerId } = props;

  // Verify existence of the corporate learner
  const existing =
    await MyGlobal.prisma.enterprise_lms_corporatelearner.findUnique({
      where: { id: corporatelearnerId },
    });
  if (!existing) throw new Error("Corporate learner not found");

  // Delete all associated progress tracking records
  await MyGlobal.prisma.enterprise_lms_progress_tracking.deleteMany({
    where: { learner_id: corporatelearnerId },
  });

  // Delete all associated enrollments
  await MyGlobal.prisma.enterprise_lms_enrollments.deleteMany({
    where: { learner_id: corporatelearnerId },
  });

  // Delete all associated certificate issuances
  await MyGlobal.prisma.enterprise_lms_certificate_issuances.deleteMany({
    where: { learner_id: corporatelearnerId },
  });

  // Delete direct messages where the learner is sender
  await MyGlobal.prisma.enterprise_lms_direct_messages.deleteMany({
    where: { sender_id: corporatelearnerId },
  });

  // Delete direct messages where the learner is recipient
  await MyGlobal.prisma.enterprise_lms_direct_messages.deleteMany({
    where: { recipient_id: corporatelearnerId },
  });

  // Delete the corporate learner record
  await MyGlobal.prisma.enterprise_lms_corporatelearner.delete({
    where: { id: corporatelearnerId },
  });
}
