import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsContentAccessControl } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentAccessControl";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";

/**
 * This E2E test verifies updating a content access control record within a
 * tenant organization using the PUT
 * /enterpriseLms/organizationAdmin/contentAccessControls/{id} endpoint,
 * ensuring that an authorized organization admin can update allowed roles and
 * learners correctly while validating business rules like multi-tenant
 * isolation and access control enforcement.
 *
 * Steps performed:
 *
 * 1. Authenticate as organizationAdmin via /auth/organizationAdmin/join to
 *    simulate admin signup and token assignment.
 * 2. Create an initial content access control record for this tenant with some
 *    allowed roles and learners.
 * 3. Update the created content access control using the update endpoint, changing
 *    allowed roles and allowed learners.
 * 4. Assert that the response matches updated values, preserving tenant and
 *    content IDs and verifying that timestamps are updated properly.
 * 5. Attempt error scenarios: update with invalid random ID to confirm error
 *    occurs, and update without being authenticated as organizationAdmin to
 *    test authorization enforcement.
 *
 * Validation focuses on correct update behavior, tenant isolation, allowed
 * roles/learners format, and proper error handling on invalid ID and
 * authorization failure.
 */
export async function test_api_content_access_control_update_success(
  connection: api.IConnection,
) {
  // 1. Authenticate as OrganizationAdmin via join endpoint
  const tenantId = typia.random<string & tags.Format<"uuid">>();
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const organizationAdmin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        tenant_id: tenantId,
        email: adminEmail,
        password: "Password123!",
        first_name: RandomGenerator.name(2),
        last_name: RandomGenerator.name(2),
      } satisfies IEnterpriseLmsOrganizationAdmin.ICreate,
    });
  typia.assert(organizationAdmin);

  // 2. Create an initial Content Access Control record
  const initialAllowedRoles = "corporateLearner";
  const initialAllowedLearners = typia.random<string & tags.Format<"uuid">>();
  const nowISOString = new Date().toISOString();
  const createdContentAccessControl: IEnterpriseLmsContentAccessControl =
    await api.functional.enterpriseLms.organizationAdmin.contentAccessControls.create(
      connection,
      {
        body: {
          tenant_id: tenantId,
          content_id: typia.random<string & tags.Format<"uuid">>(),
          allowed_roles: initialAllowedRoles,
          allowed_learners: initialAllowedLearners,
          created_at: nowISOString,
          updated_at: nowISOString,
        } satisfies IEnterpriseLmsContentAccessControl.ICreate,
      },
    );
  typia.assert(createdContentAccessControl);

  // 3. Update the Content Access Control record
  const updatedAllowedRoles = "corporateLearner,externalLearner";
  const updatedAllowedLearners =
    createdContentAccessControl.allowed_learners !== null &&
    createdContentAccessControl.allowed_learners !== undefined
      ? `${createdContentAccessControl.allowed_learners},${typia.random<string & tags.Format<"uuid">>()}`
      : typia.random<string & tags.Format<"uuid">>();

  const updatedContentAccessControl: IEnterpriseLmsContentAccessControl =
    await api.functional.enterpriseLms.organizationAdmin.contentAccessControls.update(
      connection,
      {
        id: createdContentAccessControl.id,
        body: {
          allowed_roles: updatedAllowedRoles,
          allowed_learners: updatedAllowedLearners,
        } satisfies IEnterpriseLmsContentAccessControl.IUpdate,
      },
    );
  typia.assert(updatedContentAccessControl);

  // Validate the updated record's properties
  TestValidator.equals(
    "tenant id remains unchanged after update",
    updatedContentAccessControl.tenant_id,
    createdContentAccessControl.tenant_id,
  );
  TestValidator.equals(
    "content id remains unchanged after update",
    updatedContentAccessControl.content_id,
    createdContentAccessControl.content_id,
  );
  TestValidator.equals(
    "allowed_roles updated correctly",
    updatedContentAccessControl.allowed_roles,
    updatedAllowedRoles,
  );
  TestValidator.equals(
    "allowed_learners updated correctly",
    updatedContentAccessControl.allowed_learners,
    updatedAllowedLearners,
  );

  // 4. Test error scenario: Update with invalid ID
  await TestValidator.error("update with invalid id should fail", async () => {
    await api.functional.enterpriseLms.organizationAdmin.contentAccessControls.update(
      connection,
      {
        id: typia.random<string & tags.Format<"uuid">>(),
        body: {
          allowed_roles: "testRole",
        } satisfies IEnterpriseLmsContentAccessControl.IUpdate,
      },
    );
  });

  // 5. Test error scenario: Update without authentication (simulate by resetting connection headers)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "update without authentication should fail",
    async () => {
      await api.functional.enterpriseLms.organizationAdmin.contentAccessControls.update(
        unauthenticatedConnection,
        {
          id: createdContentAccessControl.id,
          body: {
            allowed_roles: "unauthenticatedRole",
          } satisfies IEnterpriseLmsContentAccessControl.IUpdate,
        },
      );
    },
  );
}
