import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Deletes a content creator or instructor user account by ID.
 *
 * This function performs a hard delete on the
 * enterprise_lms_contentcreatorinstructor record identified by
 * `contentcreatorinstructorId`.
 *
 * It enforces authorization by ensuring that the requesting system
 * administrator belongs to the same tenant as the target user.
 *
 * @param props - Object containing the authenticated system administrator and
 *   the content creator/instructor ID to delete.
 * @param props.systemAdmin - Authenticated system administrator payload.
 * @param props.contentcreatorinstructorId - UUID of the content
 *   creator/instructor to be deleted.
 * @returns Void
 * @throws {Error} When the content creator/instructor does not exist.
 * @throws {Error} When the system administrator is unauthorized for the target
 *   tenant.
 */
export async function deleteenterpriseLmsSystemAdminContentcreatorinstructorsContentcreatorinstructorId(props: {
  systemAdmin: SystemadminPayload;
  contentcreatorinstructorId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { systemAdmin, contentcreatorinstructorId } = props;

  const contentCreator =
    await MyGlobal.prisma.enterprise_lms_contentcreatorinstructor.findUniqueOrThrow(
      {
        where: { id: contentcreatorinstructorId },
        select: { id: true, tenant_id: true },
      },
    );

  if (contentCreator.tenant_id !== systemAdmin.tenant_id) {
    throw new Error("Unauthorized: Tenant mismatch");
  }

  await MyGlobal.prisma.enterprise_lms_contentcreatorinstructor.delete({
    where: { id: contentcreatorinstructorId },
  });
}
