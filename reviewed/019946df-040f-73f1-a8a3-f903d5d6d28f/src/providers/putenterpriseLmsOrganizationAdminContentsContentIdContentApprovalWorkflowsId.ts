import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsContentApprovalWorkflow } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentApprovalWorkflow";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Update an existing content approval workflow step by content ID and approval
 * workflow step ID.
 *
 * Allows organization administrators to modify approval step details such as
 * status, comments, and reviewer role.
 *
 * This function updates records in the
 * enterprise_lms_content_approval_workflows table associated with the specified
 * content and approval step.
 *
 * It returns the updated approval workflow step details.
 *
 * @param props - Object containing organizationAdmin authorization payload,
 *   contentId and step id, and update body.
 * @param props.organizationAdmin - The authenticated organization administrator
 *   making the update.
 * @param props.contentId - UUID of the content item linked to the approval
 *   workflow step.
 * @param props.id - UUID of the content approval workflow step to update.
 * @param props.body - Partial update details for the approval workflow step.
 * @returns The updated content approval workflow step.
 * @throws {Error} If no matching approval workflow step is found.
 */
export async function putenterpriseLmsOrganizationAdminContentsContentIdContentApprovalWorkflowsId(props: {
  organizationAdmin: OrganizationadminPayload;
  contentId: string & tags.Format<"uuid">;
  id: string & tags.Format<"uuid">;
  body: IEnterpriseLmsContentApprovalWorkflow.IUpdate;
}): Promise<IEnterpriseLmsContentApprovalWorkflow> {
  const { contentId, id, body } = props;

  const data: IEnterpriseLmsContentApprovalWorkflow.IUpdate = {
    content_id: body.content_id ?? undefined,
    step_number: body.step_number ?? undefined,
    reviewer_role: body.reviewer_role ?? undefined,
    status: body.status ?? undefined,
    // For comments, allow explicit null to clear comments
    comments: body.comments === null ? null : (body.comments ?? undefined),
  };

  const updated =
    await MyGlobal.prisma.enterprise_lms_content_approval_workflows.update({
      where: {
        id,
        content_id: contentId,
      },
      data,
    });

  return {
    id: updated.id,
    content_id: updated.content_id,
    step_number: updated.step_number,
    reviewer_role: updated.reviewer_role,
    status: updated.status,
    comments: updated.comments ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
