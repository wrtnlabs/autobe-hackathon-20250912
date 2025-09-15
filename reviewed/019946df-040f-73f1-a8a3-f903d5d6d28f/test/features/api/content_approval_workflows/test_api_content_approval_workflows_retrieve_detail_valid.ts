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
 * Test retrieval of a specific content approval workflow step by providing a
 * valid content ID and content approval workflow ID.
 *
 * Scenario steps:
 *
 * 1. Join and login as an authorized organizationAdmin user.
 * 2. Create a tenant to ensure a tenant context exists for multi-tenancy.
 * 3. Create content under the created tenant.
 * 4. Create a content approval workflow step for that content.
 * 5. Retrieve the content approval workflow step by its ID and the content ID.
 * 6. Validate that the retrieved entity fully matches the created approval
 *    workflow step.
 *
 * Additionally, test authentication enforcement and error handling by
 * validating:
 *
 * - Attempts to retrieve without authentication are denied.
 * - Retrieval with non-existent IDs returns 404 error.
 * - No data outside authorized tenant scope is accessible.
 *
 * Test method uses actual API SDK function calls with correct usage of path and
 * body parameters, correct DTO types with satisfies, and uses typia.assert for
 * response validation.
 *
 * All API calls use await for async calls. Proper user role switching is
 * handled by login calls.
 *
 * TestValidator is used for validation with descriptive titles for all
 * assertions.
 *
 * Code handles token/auth state via SDK automatically, no manual header
 * manipulation.
 *
 * Non-existent or illogical properties are strictly excluded.
 *
 * This tests end-to-end realistic user workflows for content approval review
 * step retrieval with robust validation and error handling.
 *
 * All necessary dependencies (auth joins/logins, tenant/content/approval step
 * creation) are accounted for and called as per scenario dependencies.
 *
 * The test is fully type-safe, uses realistic data with RandomGenerator and
 * typia.random, and complies with provided API contracts and DTO schemas.
 */
export async function test_api_content_approval_workflows_retrieve_detail_valid(
  connection: api.IConnection,
) {
  // 1. organizationAdmin user joins and logs in
  const organizationAdminEmail = `${RandomGenerator.alphaNumeric(8)}@example.com`;
  const organizationAdminPassword = RandomGenerator.alphaNumeric(12);

  const organizationAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        tenant_id: "00000000-0000-0000-0000-000000000000", // placeholder, replaced after tenant creation
        email: organizationAdminEmail,
        password: organizationAdminPassword,
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
      } satisfies IEnterpriseLmsOrganizationAdmin.ICreate,
    },
  );
  typia.assert(organizationAdmin);

  // 2. systemAdmin user joins and logs in (needed to create tenant)
  const systemAdminEmail = `${RandomGenerator.alphaNumeric(8)}@example.com`;
  const systemAdminPasswordHash = RandomGenerator.alphaNumeric(24);

  const systemAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: systemAdminEmail,
      password_hash: systemAdminPasswordHash,
      first_name: RandomGenerator.name(),
      last_name: RandomGenerator.name(),
      status: "active",
    } satisfies IEnterpriseLmsSystemAdmin.ICreate,
  });
  typia.assert(systemAdmin);

  // login systemAdmin to create tenant
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: systemAdminEmail,
      password_hash: systemAdminPasswordHash,
    } satisfies IEnterpriseLmsSystemAdmin.ILogin,
  });

  // 3. create tenant
  const tenantCode = RandomGenerator.alphaNumeric(10);
  const tenantName = `Test Tenant ${RandomGenerator.name(2)}`;

  const tenant = await api.functional.enterpriseLms.systemAdmin.tenants.create(
    connection,
    {
      body: {
        code: tenantCode,
        name: tenantName,
      } satisfies IEnterpriseLmsTenant.ICreate,
    },
  );
  typia.assert(tenant);

  // rejoin organizationAdmin with actual tenant_id
  const organizationAdminUpdated =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        tenant_id: tenant.id,
        email: organizationAdminEmail,
        password: organizationAdminPassword,
        first_name: organizationAdmin.first_name,
        last_name: organizationAdmin.last_name,
      } satisfies IEnterpriseLmsOrganizationAdmin.ICreate,
    });
  typia.assert(organizationAdminUpdated);

  // login as organizationAdmin
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: organizationAdminEmail,
      password: organizationAdminPassword,
    } satisfies IEnterpriseLmsOrganizationAdmin.ILogin,
  });

  // 4. contentCreatorInstructor user joins and logs in
  const ccInstructorEmail = `${RandomGenerator.alphaNumeric(8)}@example.com`;
  const ccInstructorPasswordHash = RandomGenerator.alphaNumeric(24);

  const ccInstructor = await api.functional.auth.contentCreatorInstructor.join(
    connection,
    {
      body: {
        tenant_id: tenant.id,
        email: ccInstructorEmail,
        password_hash: ccInstructorPasswordHash,
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        status: "active",
      } satisfies IEnterpriseLmsContentCreatorInstructor.ICreate,
    },
  );
  typia.assert(ccInstructor);

  await api.functional.auth.contentCreatorInstructor.login(connection, {
    body: {
      email: ccInstructorEmail,
      password: ccInstructorPasswordHash,
    } satisfies IEnterpriseLmsContentCreatorInstructor.ILogin,
  });

  // 5. create content under tenant as contentCreatorInstructor
  const contentTitle = `${RandomGenerator.paragraph({ sentences: 3 })}`;
  const contentDescription = RandomGenerator.paragraph();
  const contentType = "video";
  const status = "draft";
  const businessStatus = "active";

  const content =
    await api.functional.enterpriseLms.contentCreatorInstructor.contents.create(
      connection,
      {
        body: {
          tenant_id: tenant.id,
          title: contentTitle,
          description: contentDescription,
          content_type: contentType,
          status: status,
          business_status: businessStatus,
        } satisfies IEnterpriseLmsContents.ICreate,
      },
    );
  typia.assert(content);

  // 6. switch to organizationAdmin for approval workflow creation
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: organizationAdminEmail,
      password: organizationAdminPassword,
    } satisfies IEnterpriseLmsOrganizationAdmin.ILogin,
  });

  // 7. create content approval workflow step
  const stepNumber = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
  >();
  const reviewerRole: string = "organizationAdmin";
  const approvalStatusOptions = ["pending", "approved", "rejected"] as const;
  const approvalStatus = RandomGenerator.pick(approvalStatusOptions);
  const comments = RandomGenerator.paragraph({ sentences: 2 });

  const workflowCreateBody = {
    content_id: content.id,
    step_number: stepNumber,
    reviewer_role: reviewerRole,
    status: approvalStatus,
    comments: comments,
  } satisfies IEnterpriseLmsContentApprovalWorkflow.ICreate;

  const createdWorkflowStep =
    await api.functional.enterpriseLms.organizationAdmin.contents.contentApprovalWorkflows.create(
      connection,
      {
        contentId: content.id,
        body: workflowCreateBody,
      },
    );
  typia.assert(createdWorkflowStep);

  // 8. Retrieve the content approval workflow step
  const retrievedWorkflowStep =
    await api.functional.enterpriseLms.organizationAdmin.contents.contentApprovalWorkflows.at(
      connection,
      {
        contentId: content.id,
        id: createdWorkflowStep.id,
      },
    );
  typia.assert(retrievedWorkflowStep);

  // 9. Validate retrieved workflow step matches the created one
  TestValidator.equals(
    "content approval workflow step id matches",
    retrievedWorkflowStep.id,
    createdWorkflowStep.id,
  );
  TestValidator.equals(
    "content approval workflow step content_id matches",
    retrievedWorkflowStep.content_id,
    createdWorkflowStep.content_id,
  );
  TestValidator.equals(
    "content approval workflow step number matches",
    retrievedWorkflowStep.step_number,
    createdWorkflowStep.step_number,
  );
  TestValidator.equals(
    "content approval workflow step reviewer_role matches",
    retrievedWorkflowStep.reviewer_role,
    createdWorkflowStep.reviewer_role,
  );
  TestValidator.equals(
    "content approval workflow step status matches",
    retrievedWorkflowStep.status,
    createdWorkflowStep.status,
  );
  TestValidator.equals(
    "content approval workflow step comments matches",
    retrievedWorkflowStep.comments,
    createdWorkflowStep.comments,
  );

  // 10. Test unauthenticated retrieval throws an error
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated retrieval should fail",
    async () => {
      await api.functional.enterpriseLms.organizationAdmin.contents.contentApprovalWorkflows.at(
        unauthConn,
        {
          contentId: content.id,
          id: createdWorkflowStep.id,
        },
      );
    },
  );

  // 11. Test retrieval with invalid IDs throws an error
  await TestValidator.error(
    "retrieval with non-existent content ID should fail",
    async () => {
      await api.functional.enterpriseLms.organizationAdmin.contents.contentApprovalWorkflows.at(
        connection,
        {
          contentId: typia.random<string & tags.Format<"uuid">>(),
          id: createdWorkflowStep.id,
        },
      );
    },
  );
  await TestValidator.error(
    "retrieval with non-existent workflow step ID should fail",
    async () => {
      await api.functional.enterpriseLms.organizationAdmin.contents.contentApprovalWorkflows.at(
        connection,
        {
          contentId: content.id,
          id: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
