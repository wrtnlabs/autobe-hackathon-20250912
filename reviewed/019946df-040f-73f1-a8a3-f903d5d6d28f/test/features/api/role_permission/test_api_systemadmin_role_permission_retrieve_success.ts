import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsRolePermissions } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsRolePermissions";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";

/**
 * Test scenario for successful retrieval of a system admin role permission.
 *
 * The test registers a new system admin, logs in as the system admin, and
 * then retrieves a role permission by ID. It validates authorization,
 * response structure, and data consistency.
 *
 * Steps:
 *
 * 1. Register a system admin using POST /auth/systemAdmin/join.
 * 2. Log in using POST /auth/systemAdmin/login.
 * 3. Retrieve role permission by ID using GET
 *    /enterpriseLms/systemAdmin/rolePermissions/{id}.
 * 4. Validate response fields and authorization.
 * 5. Test that unauthorized access is denied.
 * 6. Test retrieval with a non-existent ID results in error.
 */
export async function test_api_systemadmin_role_permission_retrieve_success(
  connection: api.IConnection,
) {
  // 1. Register a new system admin user
  const joinBody = {
    email: `sysadmin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(16),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;

  const authorizedAdmin = await api.functional.auth.systemAdmin.join(
    connection,
    {
      body: joinBody,
    },
  );
  typia.assert(authorizedAdmin);

  // 2. Log in as the created system admin
  const loginBody = {
    email: joinBody.email,
    password_hash: joinBody.password_hash,
  } satisfies IEnterpriseLmsSystemAdmin.ILogin;

  const loggedAdmin = await api.functional.auth.systemAdmin.login(connection, {
    body: loginBody,
  });
  typia.assert(loggedAdmin);

  // 3. Retrieve a role permission - generate a random valid UUID
  const rolePermissionId = typia.random<string & tags.Format<"uuid">>();

  const rolePermission =
    await api.functional.enterpriseLms.systemAdmin.rolePermissions.at(
      connection,
      {
        id: rolePermissionId,
      },
    );
  typia.assert(rolePermission);

  // 4. Validate core fields exist and types are correct
  TestValidator.predicate(
    "role permission id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      rolePermission.id,
    ),
  );

  TestValidator.predicate(
    "role id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
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

  TestValidator.predicate(
    "created_at is ISO 8601 date-time string",
    typeof rolePermission.created_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+\-]\d{2}:\d{2})$/.test(
        rolePermission.created_at,
      ),
  );

  TestValidator.predicate(
    "updated_at is ISO 8601 date-time string",
    typeof rolePermission.updated_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+\-]\d{2}:\d{2})$/.test(
        rolePermission.updated_at,
      ),
  );

  // 5. Test unauthenticated access is denied
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "unauthenticated access should be denied",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.rolePermissions.at(
        unauthConnection,
        {
          id: rolePermissionId,
        },
      );
    },
  );

  // 6. Test retrieving non-existent ID results in error
  const fakeId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "accessing non-existent role permission id gives error",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.rolePermissions.at(
        connection,
        { id: fakeId },
      );
    },
  );
}
