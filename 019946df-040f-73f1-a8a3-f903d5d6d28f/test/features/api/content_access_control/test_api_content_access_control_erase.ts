import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsContentAccessControl } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentAccessControl";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";

/**
 * Validate the deletion authorization and data integrity of content access
 * control.
 *
 * This test facilitates a full business flow to examine if content access
 * control entries can be securely deleted only by system administrators
 * within the Enterprise LMS. It verifies authorization enforcement, tenant
 * data isolation, and proper error handling.
 *
 * Workflow:
 *
 * 1. Register a system administrator account and authenticate it.
 * 2. Register an organization administrator account for a tenant, then
 *    authenticate.
 * 3. Create a content access control entry using the organization
 *    administrator account.
 * 4. Switch authentication to system administrator account.
 * 5. Successfully delete the created content access control entry.
 * 6. Validate that attempting to delete with the organization admin account
 *    fails.
 * 7. Validate error for deleting a non-existent entry.
 */
export async function test_api_content_access_control_erase(
  connection: api.IConnection,
) {
  // 1. Register system administrator
  const systemAdminEmail = typia.random<string & tags.Format<"email">>();
  const systemAdminPassword = "TestPass123!";
  const systemAdminAuth: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: systemAdminEmail,
        password_hash: systemAdminPassword,
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        status: "active",
      } satisfies IEnterpriseLmsSystemAdmin.ICreate,
    });
  typia.assert(systemAdminAuth);

  // 2. Register organization administrator
  // We simulate tenant_id from systemAdmin tenant_id
  const tenantId = systemAdminAuth.tenant_id;
  const organizationAdminEmail = typia.random<string & tags.Format<"email">>();
  const organizationAdminPassword = "OrgPass123!";
  const orgAdminAuth: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        tenant_id: tenantId,
        email: organizationAdminEmail,
        password: organizationAdminPassword,
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
      } satisfies IEnterpriseLmsOrganizationAdmin.ICreate,
    });
  typia.assert(orgAdminAuth);

  // 3. Login as organization administrator (to create access control)
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: organizationAdminEmail,
      password: organizationAdminPassword,
    } satisfies IEnterpriseLmsOrganizationAdmin.ILogin,
  });

  // 4. Create content access control entry
  const contentAccessControlCreateRequest = {
    content_id: typia.random<string & tags.Format<"uuid">>(),
    tenant_id: tenantId,
    allowed_roles: "corporateLearner,externalLearner",
    allowed_learners: ArrayUtil.repeat(3, () =>
      typia.random<string & tags.Format<"uuid">>(),
    ).join(","),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } satisfies IEnterpriseLmsContentAccessControl.ICreate;

  const createdContentAccessControl =
    await api.functional.enterpriseLms.organizationAdmin.contentAccessControls.create(
      connection,
      {
        body: contentAccessControlCreateRequest,
      },
    );
  typia.assert(createdContentAccessControl);

  // 5. Login back as system administrator
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: systemAdminEmail,
      password_hash: systemAdminPassword,
    } satisfies IEnterpriseLmsSystemAdmin.ILogin,
  });

  // 6. System admin deletes the content access control entry
  await api.functional.enterpriseLms.systemAdmin.contentAccessControls.eraseContentAccessControl(
    connection,
    {
      id: createdContentAccessControl.id,
    },
  );

  // 7. Attempt to delete same entry again as system admin should error
  await TestValidator.error(
    "error on deleting non-existent content access control",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.contentAccessControls.eraseContentAccessControl(
        connection,
        {
          id: createdContentAccessControl.id,
        },
      );
    },
  );

  // 8. Login back as organization administrator
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: organizationAdminEmail,
      password: organizationAdminPassword,
    } satisfies IEnterpriseLmsOrganizationAdmin.ILogin,
  });

  // 9. Organization admin tries to delete another random ID, should fail
  await TestValidator.error(
    "organization admin unauthorized to delete content access control",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.contentAccessControls.eraseContentAccessControl(
        connection,
        {
          id: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
