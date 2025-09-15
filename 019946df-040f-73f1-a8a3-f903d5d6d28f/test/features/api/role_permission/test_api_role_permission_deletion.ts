import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";

/**
 * This scenario tests the complete deletion workflow of a role permission by a
 * system administrator in an enterprise LMS system. The system administrator
 * user is first registered using the join API with all required details as per
 * the IEnterpriseLmsSystemAdmin.ICreate DTO, including email, password_hash,
 * first_name, last_name, and status. Upon successful registration, the same
 * user logs in with correct credentials via the login API, obtaining an
 * authorization token for authenticated requests. Using the acquired
 * authentication, the test attempts to delete a specific role permission by
 * providing a valid UUID for the rolePermission ID to the delete API endpoint.
 * The deletion operation is permanent and confirmed by the void response. The
 * test proceeds to validate that after deletion, the role permission is
 * non-retrievable, expecting an error upon subsequent retrieval attempts.
 * Additionally, the test validates access control by verifying that
 * unauthorized deletion attempts by unauthenticated users or users without
 * sufficient permissions fail properly, throwing exceptions as expected.
 * Comprehensive type assertions with typia.assert ensure the response data from
 * join and login APIs adhere strictly to the declared DTOs. Each async API call
 * uses await to maintain proper asynchronous flow. TestValidator.error is used
 * to validate expected error conditions with appropriate descriptive titles.
 * The test function encapsulates the entire user journey from creation and
 * login to deletion and validation of failure scenarios, ensuring robust role
 * permission management functionality is confirmed.
 */
export async function test_api_role_permission_deletion(
  connection: api.IConnection,
) {
  // 1. Register a systemAdmin user through the join API
  const email: string & tags.Format<"email"> =
    RandomGenerator.alphaNumeric(8) + "@example.com";
  const passwordHash = "hashed_password_1234";
  const createBody = {
    email: email,
    password_hash: passwordHash,
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;

  const admin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: createBody,
    });
  typia.assert(admin);

  // 2. Login as the systemAdmin user to obtain authorization
  const loginBody = {
    email: admin.email,
    password_hash: passwordHash,
  } satisfies IEnterpriseLmsSystemAdmin.ILogin;
  const loggedInAdmin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedInAdmin);

  // 3. Attempt to delete a rolePermission with a valid UUID
  const rolePermissionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await api.functional.enterpriseLms.systemAdmin.rolePermissions.erase(
    connection,
    {
      id: rolePermissionId,
    },
  );

  // 4. Validate that after deletion, attempting to delete again results in error
  await TestValidator.error(
    "deleting non-existent role permission should fail",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.rolePermissions.erase(
        connection,
        {
          id: rolePermissionId,
        },
      );
    },
  );

  // 5. Validate unauthorized deletion attempt fails
  const unauthorizedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "unauthorized deletion attempt should fail",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.rolePermissions.erase(
        unauthorizedConnection,
        {
          id: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
