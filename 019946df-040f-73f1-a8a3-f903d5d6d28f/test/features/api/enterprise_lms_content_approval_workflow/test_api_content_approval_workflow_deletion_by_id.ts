import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsContentApprovalWorkflow } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentApprovalWorkflow";
import type { IEnterpriseLmsContentCreatorInstructor } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentCreatorInstructor";
import type { IEnterpriseLmsContents } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContents";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";
import type { IEnterpriseLmsTenant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsTenant";

/**
 * Test the deletion of a content approval workflow step by ID within a
 * specific content entity.
 *
 * This test covers the entire business flow including setup of tenant,
 * organization admin, content creator instructor users, content creation,
 * approval workflow step creation, and authorized deletion. It validates
 * successful deletion, authorization enforcement, and error handling.
 *
 * Detailed steps:
 *
 * 1. Create a system admin user for tenant operations.
 * 2. Create a tenant.
 * 3. Create an organization admin user associated with the tenant.
 * 4. Create a content creator instructor user associated with the tenant.
 * 5. Create content under the tenant by the content creator instructor.
 * 6. Create a content approval workflow step linked to the content by the
 *    organization admin.
 * 7. Delete the workflow step by the organization admin.
 * 8. Attempt unauthorized deletion by content creator instructor and expect
 *    failure.
 * 9. Attempt deletion of non-existent workflow step and expect failure.
 *
 * Assertions:
 *
 * - Ensure each creation returns valid IDs.
 * - Validate successful deletion returns void.
 * - Confirm unauthorized deletion attempts return errors.
 */
export async function test_api_content_approval_workflow_deletion_by_id(
  connection: api.IConnection,
) {
  // 1. Create system administrator user
  const systemAdminEmail = typia.random<string & tags.Format<"email">>();
  const systemAdminPassword = RandomGenerator.alphaNumeric(12);
  const systemAdminCreate = {
    email: systemAdminEmail,
    password_hash: systemAdminPassword,
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;
  const systemAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: systemAdminCreate,
  });
  typia.assert(systemAdmin);

  // 2. Create tenant
  const tenantCreate = {
    code: RandomGenerator.alphaNumeric(5),
    name: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IEnterpriseLmsTenant.ICreate;
  const tenant = await api.functional.enterpriseLms.systemAdmin.tenants.create(
    connection,
    {
      body: tenantCreate,
    },
  );
  typia.assert(tenant);

  // 3. Create organization administrator user for tenant
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminPassword = RandomGenerator.alphaNumeric(12);
  const orgAdminCreate = {
    tenant_id: tenant.id,
    email: orgAdminEmail,
    password: orgAdminPassword,
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;
  const orgAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: orgAdminCreate,
    },
  );
  typia.assert(orgAdmin);

  // 4. Create content creator instructor user for tenant
  const contentCreatorEmail = typia.random<string & tags.Format<"email">>();
  const contentCreatorPassword = RandomGenerator.alphaNumeric(12);
  const contentCreatorCreate = {
    tenant_id: tenant.id,
    email: contentCreatorEmail,
    password_hash: contentCreatorPassword,
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsContentCreatorInstructor.ICreate;
  const contentCreator =
    await api.functional.auth.contentCreatorInstructor.join(connection, {
      body: contentCreatorCreate,
    });
  typia.assert(contentCreator);

  // 5. Content creator instructor login to create content
  await api.functional.auth.contentCreatorInstructor.login(connection, {
    body: {
      email: contentCreatorEmail,
      password: contentCreatorPassword,
    } satisfies IEnterpriseLmsContentCreatorInstructor.ILogin,
  });

  const contentCreate = {
    tenant_id: tenant.id,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    content_type: "video",
    status: "draft",
    business_status: "active",
  } satisfies IEnterpriseLmsContents.ICreate;
  const content =
    await api.functional.enterpriseLms.contentCreatorInstructor.contents.create(
      connection,
      {
        body: contentCreate,
      },
    );
  typia.assert(content);

  // 6. Organization admin login to create approval workflow step
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPassword,
    } satisfies IEnterpriseLmsOrganizationAdmin.ILogin,
  });

  const workflowCreate = {
    content_id: content.id,
    step_number: 1,
    reviewer_role: "organizationAdmin",
    status: "pending",
    comments: null,
  } satisfies IEnterpriseLmsContentApprovalWorkflow.ICreate;
  const workflowStep =
    await api.functional.enterpriseLms.organizationAdmin.contents.contentApprovalWorkflows.create(
      connection,
      {
        contentId: content.id,
        body: workflowCreate,
      },
    );
  typia.assert(workflowStep);

  // 7. Delete the workflow step as organization admin
  await api.functional.enterpriseLms.organizationAdmin.contents.contentApprovalWorkflows.erase(
    connection,
    {
      contentId: content.id,
      id: workflowStep.id,
    },
  );

  // 8. Unauthorized user (content creator) login
  await api.functional.auth.contentCreatorInstructor.login(connection, {
    body: {
      email: contentCreatorEmail,
      password: contentCreatorPassword,
    } satisfies IEnterpriseLmsContentCreatorInstructor.ILogin,
  });

  // 9. Attempt unauthorized deletion of workflow step and expect error
  await TestValidator.error(
    "unauthorized user cannot delete workflow step",
    async () => {
      await api.functional.enterpriseLms.organizationAdmin.contents.contentApprovalWorkflows.erase(
        connection,
        {
          contentId: content.id,
          id: workflowStep.id,
        },
      );
    },
  );

  // 10. Attempt to delete non-existent workflow step
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPassword,
    } satisfies IEnterpriseLmsOrganizationAdmin.ILogin,
  });

  await TestValidator.error(
    "deletion of non-existent workflow step should fail",
    async () => {
      await api.functional.enterpriseLms.organizationAdmin.contents.contentApprovalWorkflows.erase(
        connection,
        {
          contentId: content.id,
          id: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
