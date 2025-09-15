import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsContentApprovalWorkflow } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentApprovalWorkflow";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Retrieve a content approval workflow step by content ID and step ID.
 *
 * Retrieves detailed information about a specific content approval workflow
 * step tied to a content entity within the tenant of the organization admin.
 * Enforces tenant isolation and authorization, ensuring only authorized
 * organization admins access.
 *
 * @param props - Object containing organizationAdmin info, content ID, and
 *   approval workflow step ID
 * @param props.organizationAdmin - The authenticated organization admin
 *   performing the request
 * @param props.contentId - UUID of the target content
 * @param props.id - UUID of the content approval workflow step
 * @returns The content approval workflow step information
 * @throws {Error} When the content approval workflow step does not exist or
 *   tenant mismatch
 */
export async function getenterpriseLmsOrganizationAdminContentsContentIdContentApprovalWorkflowsId(props: {
  organizationAdmin: OrganizationadminPayload;
  contentId: string & tags.Format<"uuid">;
  id: string & tags.Format<"uuid">;
}): Promise<IEnterpriseLmsContentApprovalWorkflow> {
  const { organizationAdmin, contentId, id } = props;

  const record =
    await MyGlobal.prisma.enterprise_lms_content_approval_workflows.findFirst({
      where: {
        id,
        content_id: contentId,
      },
      include: {
        content: true,
      },
    });

  if (!record || record.content.tenant_id !== organizationAdmin.tenant_id) {
    throw new Error("Content approval workflow step not found");
  }

  return {
    id: record.id,
    content_id: record.content_id,
    step_number: record.step_number,
    reviewer_role: record.reviewer_role,
    status: record.status,
    comments: record.comments ?? null,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
  };
}
