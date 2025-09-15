import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Delete forum by forumId
 *
 * Permanently deletes a discussion forum from the Enterprise LMS for the
 * authorized organization administrator. Ensures tenant isolation by checking
 * the forum belongs to the administrator's tenant. Performs a hard delete,
 * cascading deletes dependent relations as per database constraints.
 *
 * @param props - Object containing the organizationAdmin payload and the
 *   forumId to delete
 * @param props.organizationAdmin - The authorized organization administrator
 *   executing the deletion
 * @param props.forumId - UUID string identifying the forum to be deleted
 * @throws {Error} Throws if the forum does not exist
 * @throws {Error} Throws if the organizationAdmin's tenant does not match the
 *   forum's tenant
 */
export async function deleteenterpriseLmsOrganizationAdminForumsForumId(props: {
  organizationAdmin: OrganizationadminPayload;
  forumId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { organizationAdmin, forumId } = props;

  const forum = await MyGlobal.prisma.enterprise_lms_forums.findUnique({
    where: { id: forumId },
    select: { id: true, tenant_id: true },
  });

  if (!forum) {
    throw new Error("Forum not found");
  }

  if (forum.tenant_id !== organizationAdmin.id) {
    throw new Error("Unauthorized: Tenant mismatch");
  }

  await MyGlobal.prisma.enterprise_lms_forums.delete({
    where: { id: forumId },
  });
}
