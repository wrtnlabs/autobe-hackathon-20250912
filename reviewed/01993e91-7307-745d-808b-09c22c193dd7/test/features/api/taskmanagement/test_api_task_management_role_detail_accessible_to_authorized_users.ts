import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementTaskManagementRoles } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskManagementRoles";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * Test detailed retrieval of a TaskManagementRole by ID for authorized users.
 *
 * This test validates secure role detail access for authenticated TPM users.
 *
 * It covers user registration, login, role creation, detail retrieval,
 * unauthorized access denial, and error handling for invalid and non-existing
 * IDs.
 */
export async function test_api_task_management_role_detail_accessible_to_authorized_users(
  connection: api.IConnection,
) {
  // 1. Register a TPM user (join)
  const joinBody = {
    email: `user${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: "Password123!",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;
  const tpmUser: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, { body: joinBody });
  typia.assert(tpmUser);

  // 2. Login the TPM user to get token (redundant but per scenario)
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
  } satisfies ITaskManagementTpm.ILogin;
  const loginUser: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.login(connection, { body: loginBody });
  typia.assert(loginUser);

  // 3. Create a TaskManagementRole for test
  const createBody = {
    code: RandomGenerator.alphaNumeric(4).toUpperCase(),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ITaskManagementTaskManagementRoles.ICreate;
  const role: ITaskManagementTaskManagementRoles =
    await api.functional.taskManagement.tpm.taskManagementRoles.create(
      connection,
      { body: createBody },
    );
  typia.assert(role);
  TestValidator.equals("role code matches", role.code, createBody.code);

  // 4. Retrieve the role by ID
  const retrievedRole: ITaskManagementTaskManagementRoles =
    await api.functional.taskManagement.tpm.taskManagementRoles.at(connection, {
      id: role.id,
    });
  typia.assert(retrievedRole);
  TestValidator.equals(
    "retrieved role id matches created role id",
    retrievedRole.id,
    role.id,
  );

  // 5. Unauthorized access test
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthorized access should fail", async () => {
    await api.functional.taskManagement.tpm.taskManagementRoles.at(unauthConn, {
      id: role.id,
    });
  });

  // 6. Invalid UUID format error test
  await TestValidator.error("invalid UUID format should fail", async () => {
    await api.functional.taskManagement.tpm.taskManagementRoles.at(connection, {
      id: "not-a-valid-uuid-string",
    });
  });

  // 7. Non-existing ID error test
  let nonExistentId = typia.random<string & tags.Format<"uuid">>();
  if (nonExistentId === role.id) {
    nonExistentId = typia.random<string & tags.Format<"uuid">>();
  }
  await TestValidator.error("non-existing role id should fail", async () => {
    await api.functional.taskManagement.tpm.taskManagementRoles.at(connection, {
      id: nonExistentId,
    });
  });
}
