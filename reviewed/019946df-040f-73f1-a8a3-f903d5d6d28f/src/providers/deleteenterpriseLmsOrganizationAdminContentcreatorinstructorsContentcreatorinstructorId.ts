import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Deletes a Content Creator or Instructor user account.
 *
 * This operation permanently removes the record from the database. It enforces
 * authorization by ensuring the requesting Organization Admin belongs to the
 * same tenant as the target Content Creator Instructor, preserving tenant data
 * isolation.
 *
 * @param props - Object containing the Organization Admin payload and the ID of
 *   the content creator/instructor to delete.
 * @returns Void
 * @throws {Error} If the content creator/instructor is not found
 * @throws {Error} If the Organization Admin tenant does not match the target
 *   user's tenant
 */
export async function deleteenterpriseLmsOrganizationAdminContentcreatorinstructorsContentcreatorinstructorId(props: {
  organizationAdmin: OrganizationadminPayload;
  contentcreatorinstructorId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { organizationAdmin, contentcreatorinstructorId } = props;

  // Fetch Organization Admin with tenant_id for authorization
  const orgAdmin =
    await MyGlobal.prisma.enterprise_lms_organizationadmin.findUnique({
      where: { id: organizationAdmin.id },
      select: { tenant_id: true },
    });

  if (!orgAdmin) {
    throw new Error("Organization admin not found");
  }

  // Fetch Content Creator Instructor with tenant_id
  const contentCreatorInstructor =
    await MyGlobal.prisma.enterprise_lms_contentcreatorinstructor.findUnique({
      where: { id: contentcreatorinstructorId },
      select: { tenant_id: true },
    });

  if (!contentCreatorInstructor) {
    throw new Error("Content creator instructor not found");
  }

  // Authorization: ensure same tenant
  if (contentCreatorInstructor.tenant_id !== orgAdmin.tenant_id) {
    throw new Error("Unauthorized: Tenant mismatch");
  }

  // Hard delete content creator instructor
  await MyGlobal.prisma.enterprise_lms_contentcreatorinstructor.delete({
    where: { id: contentcreatorinstructorId },
  });
}
