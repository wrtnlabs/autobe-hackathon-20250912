import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsContentAccessControl } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentAccessControl";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";

/**
 * Validate the creation of content access control in Enterprise LMS by an
 * authorized organization admin user.
 *
 * The test follows these steps:
 *
 * 1. Register a new organization admin with all required details for a tenant.
 * 2. Login with the same organization admin credentials to validate token issuance
 *    and login.
 * 3. Create a content access control entry with the appropriate content ID, tenant
 *    ID, allowed roles, and learners.
 * 4. Validate that the content access control entry is created successfully with
 *    correct properties.
 *
 * Throughout, use SDK-managed authorization tokens without manual header
 * manipulation. Use typia.assert for response validation and TestValidator for
 * business logic assertions.
 */
export async function test_api_content_access_control_creation_with_authorization(
  connection: api.IConnection,
) {
  // 1. Organization Admin registration
  const tenantId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const orgAdminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password = "SecurePass123!";
  const createAdminBody = {
    tenant_id: tenantId,
    email: orgAdminEmail,
    password: password,
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;

  const joinedAdmin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: createAdminBody,
    });
  typia.assert(joinedAdmin);
  TestValidator.equals(
    "organization admin tenant ID matches",
    joinedAdmin.tenant_id,
    tenantId,
  );
  TestValidator.equals(
    "organization admin email matches",
    joinedAdmin.email,
    orgAdminEmail,
  );

  // 2. Organization Admin login to validate session
  const loginBody = {
    email: orgAdminEmail,
    password: password,
  } satisfies IEnterpriseLmsOrganizationAdmin.ILogin;

  const loggedInAdmin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedInAdmin);
  TestValidator.equals(
    "logged in admin tenant ID matches",
    loggedInAdmin.tenant_id,
    tenantId,
  );
  TestValidator.equals(
    "logged in admin email matches",
    loggedInAdmin.email,
    orgAdminEmail,
  );

  // 3. Create Content Access Control entry
  const contentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Prepare multi-role and multi-learner strings
  const allowedRoles = ["corporateLearner", "externalLearner"] as const;
  const allowedRolesString = allowedRoles.join(",");
  const allowedLearners = [
    typia.random<string & tags.Format<"uuid">>(),
    typia.random<string & tags.Format<"uuid">>(),
  ];
  const allowedLearnersString = allowedLearners.join(",");

  // Current timestamp for created_at and updated_at
  const now = new Date().toISOString();

  const createContentAccessControlBody = {
    content_id: contentId,
    tenant_id: tenantId,
    allowed_roles: allowedRolesString,
    allowed_learners: allowedLearnersString,
    created_at: now,
    updated_at: now,
  } satisfies IEnterpriseLmsContentAccessControl.ICreate;

  const createdAccessControl: IEnterpriseLmsContentAccessControl =
    await api.functional.enterpriseLms.organizationAdmin.contentAccessControls.create(
      connection,
      {
        body: createContentAccessControlBody,
      },
    );
  typia.assert(createdAccessControl);

  TestValidator.predicate(
    "created access control ID is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      createdAccessControl.id,
    ),
  );
  TestValidator.equals(
    "content_id matches",
    createdAccessControl.content_id,
    contentId,
  );
  TestValidator.equals(
    "tenant_id matches",
    createdAccessControl.tenant_id,
    tenantId,
  );
  TestValidator.equals(
    "allowed_roles matches",
    createdAccessControl.allowed_roles ?? "",
    allowedRolesString,
  );
  TestValidator.equals(
    "allowed_learners matches",
    createdAccessControl.allowed_learners ?? "",
    allowedLearnersString,
  );
  TestValidator.equals(
    "created_at matches",
    createdAccessControl.created_at,
    now,
  );
  TestValidator.equals(
    "updated_at matches",
    createdAccessControl.updated_at,
    now,
  );
}
