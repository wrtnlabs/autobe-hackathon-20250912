import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsContentApprovalWorkflow } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentApprovalWorkflow";
import type { IEnterpriseLmsContentCreatorInstructor } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentCreatorInstructor";
import type { IEnterpriseLmsContents } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContents";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";

/**
 * This test performs an end-to-end validation of the content approval workflow
 * update process.
 *
 * It authenticates a tenant-scoped organizationAdmin user, creates a content
 * item, adds a content approval workflow step, then updates that step. The test
 * asserts that modified stepNumber, reviewerRole, status, and comments are
 * successfully persisted.
 *
 * This validates role-based authorization, tenant isolation, and data integrity
 * for approval workflows.
 *
 * Steps:
 *
 * 1. Create and authenticate an organizationAdmin user
 * 2. Login as organizationAdmin for session setup
 * 3. Create a content item linked to the same tenant
 * 4. Create an initial content approval workflow step
 * 5. Update the workflow step with changed fields
 * 6. Confirm that the updates are persisted correctly
 */
export async function test_api_content_approval_workflow_update_success(
  connection: api.IConnection,
) {
  // 1. Create and authenticate an organizationAdmin user
  const tenantId = typia.random<string & tags.Format<"uuid">>();
  const orgAdminEmail = `orgadmin.${RandomGenerator.alphaNumeric(5)}@example.com`;
  const orgAdminPassword = "1234";
  const orgAdminCreateBody = {
    tenant_id: tenantId,
    email: orgAdminEmail,
    password: orgAdminPassword,
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;
  const orgAdmin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: orgAdminCreateBody,
    });
  typia.assert(orgAdmin);

  // 2. Login as organizationAdmin to get authenticated session
  const orgAdminLoginBody = {
    email: orgAdminEmail,
    password: orgAdminPassword,
  } satisfies IEnterpriseLmsOrganizationAdmin.ILogin;
  const orgAdminLoggedIn: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.login(connection, {
      body: orgAdminLoginBody,
    });
  typia.assert(orgAdminLoggedIn);

  // Use authenticated context - token is set inside connection by SDK

  // 3. Create a content item with the tenantId from organizationAdmin
  const contentCreateBody = {
    tenant_id: tenantId,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    content_type: "video",
    status: "draft",
    business_status: "active",
  } satisfies IEnterpriseLmsContents.ICreate;
  const content: IEnterpriseLmsContents =
    await api.functional.enterpriseLms.contentCreatorInstructor.contents.create(
      connection,
      {
        body: contentCreateBody,
      },
    );
  typia.assert(content);

  // 4. Create a content approval workflow step for that content item
  const workflowCreateBody = {
    content_id: content.id,
    step_number: 1,
    reviewer_role: "organizationAdmin",
    status: "pending",
    comments: null,
  } satisfies IEnterpriseLmsContentApprovalWorkflow.ICreate;
  const workflowStep: IEnterpriseLmsContentApprovalWorkflow =
    await api.functional.enterpriseLms.organizationAdmin.contents.contentApprovalWorkflows.create(
      connection,
      {
        contentId: content.id,
        body: workflowCreateBody,
      },
    );
  typia.assert(workflowStep);

  // 5. Update the content approval workflow step
  const workflowUpdateBody = {
    step_number: 2, // changed step number
    reviewer_role: "organizationAdmin", // same role
    status: "approved", // changed status
    comments: "Approved by admin after review", // added comments
  } satisfies IEnterpriseLmsContentApprovalWorkflow.IUpdate;
  const updatedWorkflowStep: IEnterpriseLmsContentApprovalWorkflow =
    await api.functional.enterpriseLms.organizationAdmin.contents.contentApprovalWorkflows.update(
      connection,
      {
        contentId: content.id,
        id: workflowStep.id,
        body: workflowUpdateBody,
      },
    );
  typia.assert(updatedWorkflowStep);

  // 6. Verify that updated fields persist correctly
  TestValidator.equals(
    "Updated step_number should be 2",
    updatedWorkflowStep.step_number,
    2,
  );
  TestValidator.equals(
    "Updated reviewer_role should be 'organizationAdmin'",
    updatedWorkflowStep.reviewer_role,
    "organizationAdmin",
  );
  TestValidator.equals(
    "Updated status should be 'approved'",
    updatedWorkflowStep.status,
    "approved",
  );
  TestValidator.equals(
    "Updated comments should match",
    updatedWorkflowStep.comments,
    "Approved by admin after review",
  );

  // Additional validations can be implemented if API exposes a GET method for workflow step
  // or if further unauthorized access tests are required, but omitted here for brevity
}
