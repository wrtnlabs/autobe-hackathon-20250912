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
 * This end-to-end test verifies the successful creation of a content
 * approval workflow step in the Enterprise LMS for a given content item.
 *
 * The scenario involves multiple user roles: an organization administrator
 * and a content creator instructor, requiring proper authentication of each
 * and role switching.
 *
 * The test process:
 *
 * 1. Register and authenticate an organization administrator user.
 * 2. Register and authenticate a content creator instructor user.
 * 3. The content creator instructor creates a new content item.
 * 4. The organization administrator creates a new content approval workflow
 *    step associated with that content item, setting step number, reviewer
 *    role, status, and optional comments.
 * 5. Verify that the created approval workflow has the correct association and
 *    fields.
 * 6. Test negative cases including unauthorized access, invalid contentId.
 *
 * The test validates business rules and API contract correctness by
 * asserting type-safe API responses and proper error behaviors.
 */
export async function test_api_content_approval_workflow_creation_success(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an organization administrator user
  const orgTenantId: string = typia.random<string & tags.Format<"uuid">>();
  const orgAdminEmail: string = typia.random<string & tags.Format<"email">>();
  const orgAdminCreateBody = {
    tenant_id: orgTenantId,
    email: orgAdminEmail,
    password: "SecurePass123!",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;

  const orgAdmin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: orgAdminCreateBody,
    });
  typia.assert(orgAdmin);
  TestValidator.equals(
    "organization admin tenant_id matches",
    orgAdmin.tenant_id,
    orgTenantId,
  );
  TestValidator.equals(
    "organization admin email matches",
    orgAdmin.email,
    orgAdminEmail,
  );

  // 2. Register and authenticate a content creator instructor user
  const creatorEmail: string = typia.random<string & tags.Format<"email">>();
  const creatorCreateBody = {
    tenant_id: orgTenantId,
    email: creatorEmail,
    password_hash: "HashedPass456$",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsContentCreatorInstructor.ICreate;

  const creator: IEnterpriseLmsContentCreatorInstructor.IAuthorized =
    await api.functional.auth.contentCreatorInstructor.join(connection, {
      body: creatorCreateBody,
    });
  typia.assert(creator);
  TestValidator.equals(
    "content creator tenant_id matches",
    creator.tenant_id,
    orgTenantId,
  );
  TestValidator.equals(
    "content creator email matches",
    creator.email,
    creatorEmail,
  );

  // 3. Authenticate as content creator instructor user for content creation
  await api.functional.auth.contentCreatorInstructor.login(connection, {
    body: {
      email: creatorEmail,
      password: "HashedPass456$",
    } satisfies IEnterpriseLmsContentCreatorInstructor.ILogin,
  });

  // 4. Create a content item under this tenant by content creator instructor
  const contentCreateBody = {
    tenant_id: orgTenantId,
    title: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    content_type: "video",
    status: "draft",
    business_status: "active",
  } satisfies IEnterpriseLmsContents.ICreate;

  const createdContent: IEnterpriseLmsContents =
    await api.functional.enterpriseLms.contentCreatorInstructor.contents.create(
      connection,
      {
        body: contentCreateBody,
      },
    );
  typia.assert(createdContent);
  TestValidator.equals(
    "content tenant_id matches",
    createdContent.tenant_id,
    orgTenantId,
  );
  TestValidator.equals(
    "content title matches",
    createdContent.title,
    contentCreateBody.title,
  );
  TestValidator.equals(
    "content content_type matches",
    createdContent.content_type,
    contentCreateBody.content_type,
  );
  TestValidator.equals(
    "content status matches",
    createdContent.status,
    contentCreateBody.status,
  );
  TestValidator.equals(
    "content business_status matches",
    createdContent.business_status,
    contentCreateBody.business_status,
  );

  // 5. Authenticate as organization administrator for workflow creation
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: "SecurePass123!",
    } satisfies IEnterpriseLmsOrganizationAdmin.ILogin,
  });

  // 6. Create a content approval workflow step linked to the created content
  const workflowCreateBody = {
    content_id: createdContent.id,
    step_number: 1,
    reviewer_role: "organizationAdmin",
    status: "pending",
    comments: "Initial approval step",
  } satisfies IEnterpriseLmsContentApprovalWorkflow.ICreate;

  const createdWorkflow: IEnterpriseLmsContentApprovalWorkflow =
    await api.functional.enterpriseLms.organizationAdmin.contents.contentApprovalWorkflows.create(
      connection,
      {
        contentId: createdContent.id,
        body: workflowCreateBody,
      },
    );
  typia.assert(createdWorkflow);

  TestValidator.equals(
    "workflow content_id matches",
    createdWorkflow.content_id,
    createdContent.id,
  );
  TestValidator.equals(
    "workflow step_number matches",
    createdWorkflow.step_number,
    workflowCreateBody.step_number,
  );
  TestValidator.equals(
    "workflow reviewer_role matches",
    createdWorkflow.reviewer_role,
    workflowCreateBody.reviewer_role,
  );
  TestValidator.equals(
    "workflow status matches",
    createdWorkflow.status,
    workflowCreateBody.status,
  );
  TestValidator.equals(
    "workflow comments matches",
    createdWorkflow.comments ?? null,
    workflowCreateBody.comments ?? null,
  );

  // 7. Negative test: Attempt unauthorized content approval workflow creation
  await TestValidator.error(
    "unauthorized user cannot create content approval workflow",
    async () => {
      // Login as contentCreatorInstructor user (not organizationAdmin)
      await api.functional.auth.contentCreatorInstructor.login(connection, {
        body: {
          email: creatorEmail,
          password: "HashedPass456$",
        } satisfies IEnterpriseLmsContentCreatorInstructor.ILogin,
      });

      await api.functional.enterpriseLms.organizationAdmin.contents.contentApprovalWorkflows.create(
        connection,
        {
          contentId: createdContent.id,
          body: workflowCreateBody,
        },
      );
    },
  );

  // 8. Negative test: Attempt creation with invalid contentId
  await TestValidator.error(
    "creation fails with invalid contentId",
    async () => {
      await api.functional.enterpriseLms.organizationAdmin.contents.contentApprovalWorkflows.create(
        connection,
        {
          // Random UUID that does not exist
          contentId: typia.random<string & tags.Format<"uuid">>(),
          body: workflowCreateBody,
        },
      );
    },
  );
}
