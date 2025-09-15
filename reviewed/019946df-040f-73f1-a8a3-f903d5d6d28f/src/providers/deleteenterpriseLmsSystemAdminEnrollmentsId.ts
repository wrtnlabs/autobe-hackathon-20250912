import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Soft delete an enrollment by ID in the Enterprise LMS.
 *
 * This function updates the 'deleted_at' timestamp for the enrollment record
 * identified by the given ID, marking it as logically deleted.
 *
 * Only users with 'systemAdmin' role can perform this operation.
 *
 * @param props - Object containing the authenticated systemAdmin and the
 *   enrollment ID
 * @param props.systemAdmin - Authenticated system administrator payload
 * @param props.id - UUID of the enrollment to soft delete
 * @returns Promise<void>
 * @throws {Error} If the enrollment record does not exist
 */
export async function deleteenterpriseLmsSystemAdminEnrollmentsId(props: {
  systemAdmin: SystemadminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { systemAdmin, id } = props;

  // Verify enrollment exists
  await MyGlobal.prisma.enterprise_lms_enrollments.findUniqueOrThrow({
    where: { id },
  });

  // Prepare deleted_at timestamp
  const deletedAt = toISOStringSafe(new Date());

  // Perform soft delete by setting deleted_at
  await MyGlobal.prisma.enterprise_lms_enrollments.update({
    where: { id },
    data: { deleted_at: deletedAt },
  });
}
