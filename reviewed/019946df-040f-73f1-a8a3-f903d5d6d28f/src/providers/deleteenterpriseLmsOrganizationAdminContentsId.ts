import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Delete a specific content record by its ID
 *
 * Permanently deletes a content entity including all its metadata from the
 * Enterprise LMS database. This operation is irreversible and removes the
 * content identified by the unique content ID provided as a path parameter.
 * Proper security measures ensure only authorized roles can perform this action
 * to maintain data isolation in the multi-tenant architecture.
 *
 * @param props - Object containing the organization admin user and content ID
 *   to delete
 * @param props.organizationAdmin - The authenticated organization administrator
 *   performing the deletion
 * @param props.id - Unique identifier of the content to be deleted
 * @throws {Error} Throws if the content does not exist or if the organization
 *   admin is unauthorized
 */
export async function deleteenterpriseLmsOrganizationAdminContentsId(props: {
  organizationAdmin: OrganizationadminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { organizationAdmin, id } = props;

  // Fetch organizationAdmin record to determine tenant_id
  const admin =
    await MyGlobal.prisma.enterprise_lms_organizationadmin.findUniqueOrThrow({
      where: { id: organizationAdmin.id },
    });

  // Fetch the content record by id
  const content = await MyGlobal.prisma.enterprise_lms_contents.findUnique({
    where: { id },
  });

  // Throw error if content not found
  if (!content) throw new Error("Content not found");

  // Verify tenant ownership to enforce multi-tenant data isolation
  if (content.tenant_id !== admin.tenant_id) {
    throw new Error("Unauthorized: tenant mismatch");
  }

  // Perform a hard delete (permanent removal)
  await MyGlobal.prisma.enterprise_lms_contents.delete({
    where: { id },
  });
}
