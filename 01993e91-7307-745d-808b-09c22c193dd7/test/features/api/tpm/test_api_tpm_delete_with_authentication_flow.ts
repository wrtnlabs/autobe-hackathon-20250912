import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

export async function test_api_tpm_delete_with_authentication_flow(
  connection: api.IConnection,
) {
  // Step 1: Register TPM user
  const joinBody = {
    email: `e2e_tpm_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "Test1234!",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;

  const authorized: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, { body: joinBody });
  typia.assert(authorized);

  // Step 2: Login TPM user
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
  } satisfies ITaskManagementTpm.ILogin;

  const loggedIn: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.login(connection, { body: loginBody });
  typia.assert(loggedIn);

  // Step 3: Delete TPM user
  await api.functional.taskManagement.tpm.taskManagement.tpms.erase(
    connection,
    {
      id: authorized.id,
    },
  );

  // Step 4: Attempt deleting non-existent user (should fail)
  await TestValidator.error(
    "deleting non-existent user should fail",
    async () => {
      await api.functional.taskManagement.tpm.taskManagement.tpms.erase(
        connection,
        {
          id: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // Step 5: Attempt deleting without authentication (should fail)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error("deleting without auth should fail", async () => {
    await api.functional.taskManagement.tpm.taskManagement.tpms.erase(
      unauthConn,
      { id: authorized.id },
    );
  });
}
