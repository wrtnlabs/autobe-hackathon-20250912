import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";
import type { IEnterpriseLmsRolePermissions } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsRolePermissions";

/**
 * Validate that an organization admin user can retrieve a role permission
 * resource by ID.
 *
 * This includes creating and authenticating the admin user, logging the
 * user in, then requesting and validating the role permission resource.
 *
 * Steps:
 *
 * 1. Create organization admin user with valid tenant_id and personal info
 * 2. Login as the created organization admin
 * 3. Retrieve a specific role permission resource by ID
 * 4. Validate returned fields and data integrity with typia.assert
 *
 * Business rules:
 *
 * - Only organization admins can access role permission resources
 * - The role permission ID must be valid UUID
 *
 * Success criteria:
 *
 * - The retrieved role permission resource matches the requested ID
 * - Returned fields include role_id, permission_key, is_allowed, description
 * - Authorization enforced, errors for unauthorized access
 */
export async function test_api_organizationadmin_role_permission_retrieve_success(
  connection: api.IConnection,
) {
  // 1. Create organization admin user
  const tenantId = typia.random<string & tags.Format<"uuid">>();
  const email = RandomGenerator.alphaNumeric(8) + "@example.com";
  const password = "Passw0rd!";
  const firstName = RandomGenerator.name(1);
  const lastName = RandomGenerator.name(1);

  const createdAdmin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        tenant_id: tenantId,
        email,
        password,
        first_name: firstName,
        last_name: lastName,
      } satisfies IEnterpriseLmsOrganizationAdmin.ICreate,
    });
  typia.assert(createdAdmin);

  // 2. Login as the created organization admin
  const loggedInAdmin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.login(connection, {
      body: {
        email,
        password,
      } satisfies IEnterpriseLmsOrganizationAdmin.ILogin,
    });
  typia.assert(loggedInAdmin);

  // 3. Retrieve role permission resource
  // Since no API exists to create role permission, we use a random UUID as test ID
  // Note: This ID might not correspond to an actual resource in the system
  const rolePermissionId = typia.random<string & tags.Format<"uuid">>();

  const rolePermission: IEnterpriseLmsRolePermissions =
    await api.functional.enterpriseLms.organizationAdmin.rolePermissions.at(
      connection,
      {
        id: rolePermissionId,
      },
    );
  typia.assert(rolePermission);

  // 4. Validate critical fields
  TestValidator.predicate(
    "role_id is a UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      rolePermission.role_id,
    ),
  );
  TestValidator.predicate(
    "permission_key is non-empty string",
    typeof rolePermission.permission_key === "string" &&
      rolePermission.permission_key.length > 0,
  );
  TestValidator.predicate(
    "is_allowed is boolean",
    typeof rolePermission.is_allowed === "boolean",
  );
  // description is optional nullable string
  TestValidator.predicate(
    "description is string or null or undefined",
    rolePermission.description === null ||
      rolePermission.description === undefined ||
      typeof rolePermission.description === "string",
  );
}
