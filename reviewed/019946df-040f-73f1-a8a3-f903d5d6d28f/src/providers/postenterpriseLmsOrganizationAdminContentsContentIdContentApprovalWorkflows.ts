import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsContentApprovalWorkflow } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentApprovalWorkflow";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Create a new content approval workflow step for a given content ID.
 *
 * This endpoint allows organization administrators to define new steps in the
 * content approval process, specifying reviewer roles and approval sequence.
 *
 * @param props - Object containing authorization, path parameter and request
 *   body
 * @param props.organizationAdmin - The authenticated organization administrator
 *   payload
 * @param props.contentId - The UUID of the content to which the approval step
 *   is linked
 * @param props.body - The request body containing approval step details
 * @returns The newly created content approval workflow step
 * @throws {Error} Throws if the content with the given ID does not exist
 */
export async function postenterpriseLmsOrganizationAdminContentsContentIdContentApprovalWorkflows(props: {
  organizationAdmin: OrganizationadminPayload;
  contentId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsContentApprovalWorkflow.ICreate;
}): Promise<IEnterpriseLmsContentApprovalWorkflow> {
  // Verify that the content exists
  const content = await MyGlobal.prisma.enterprise_lms_contents.findUnique({
    where: { id: props.contentId },
  });

  if (!content) {
    throw new Error(`Content with id ${props.contentId} not found`);
  }

  // Generate timestamps as ISO strings
  const now = toISOStringSafe(new Date());

  // Create the new approval workflow step
  const created =
    await MyGlobal.prisma.enterprise_lms_content_approval_workflows.create({
      data: {
        id: v4(),
        content_id: props.contentId,
        step_number: props.body.step_number,
        reviewer_role: props.body.reviewer_role,
        status: props.body.status,
        // comments is optional nullable
        comments: props.body.comments ?? undefined,
        created_at: now,
        updated_at: now,
      },
    });

  // Return the created record, ensure dates are strings with correct brand
  return {
    id: created.id,
    content_id: created.content_id,
    step_number: created.step_number,
    reviewer_role: created.reviewer_role,
    status: created.status,
    comments: created.comments ?? null,
    created_at: created.created_at,
    updated_at: created.updated_at,
  };
}
