import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Deletes a content approval workflow step by content ID and step ID.
 *
 * Performs a soft delete by setting deleted_at timestamp. Ensures only the
 * organization administrator of the same tenant can delete.
 *
 * @param props - The parameters including the authenticated organization admin
 *   and the identifiers.
 * @param props.organizationAdmin - The authenticated organization
 *   administrator.
 * @param props.contentId - The UUID of the content item.
 * @param props.id - The UUID of the content approval workflow step.
 * @throws {Error} When the workflow step does not exist.
 * @throws {Error} When the tenant IDs do not match (unauthorized).
 */
export async function deleteenterpriseLmsOrganizationAdminContentsContentIdContentApprovalWorkflowsId(props: {
  organizationAdmin: OrganizationadminPayload;
  contentId: string & tags.Format<"uuid">;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { organizationAdmin, contentId, id } = props;

  // Fetch organization admin record to get tenant_id
  const adminRecord =
    await MyGlobal.prisma.enterprise_lms_organizationadmin.findUniqueOrThrow({
      where: { id: organizationAdmin.id },
    });

  // Fetch workflow step including content
  const workflowStep =
    await MyGlobal.prisma.enterprise_lms_content_approval_workflows.findFirstOrThrow(
      {
        where: {
          id,
          content_id: contentId,
          deleted_at: null,
        },
        include: {
          content: true,
        },
      },
    );

  // Check tenant ownership
  if (workflowStep.content.tenant_id !== adminRecord.tenant_id) {
    throw new Error("Unauthorized: Tenant mismatch");
  }

  // Soft delete by setting deleted_at timestamp
  const deletedAt = toISOStringSafe(new Date());
  await MyGlobal.prisma.enterprise_lms_content_approval_workflows.update({
    where: { id },
    data: { deleted_at: deletedAt },
  });
}
