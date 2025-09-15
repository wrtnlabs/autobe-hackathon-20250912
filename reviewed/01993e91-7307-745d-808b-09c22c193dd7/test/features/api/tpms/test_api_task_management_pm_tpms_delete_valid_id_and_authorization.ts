import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementPm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPm";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

export async function test_api_task_management_pm_tpms_delete_valid_id_and_authorization(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as PM user (join)
  const pmCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPm.ICreate;

  const pmAuthorized: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.join(connection, {
      body: pmCreateBody,
    });
  typia.assert(pmAuthorized);

  // Step 2: Create TPM user
  const tpmCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(20),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.ICreate;

  const tpm: ITaskManagementTpm =
    await api.functional.taskManagement.pm.taskManagement.tpms.create(
      connection,
      {
        body: tpmCreateBody,
      },
    );
  typia.assert(tpm);

  // Step 3: Delete TPM user with PM authorization
  await api.functional.taskManagement.pm.taskManagement.tpms.erase(connection, {
    id: tpm.id,
  });

  // Step 4: Verify deletion by attempting to delete same TPM user again, expecting error
  await TestValidator.error(
    "deletion of non-existent TPM user should fail",
    async () => {
      await api.functional.taskManagement.pm.taskManagement.tpms.erase(
        connection,
        {
          id: tpm.id,
        },
      );
    },
  );

  // Step 5: Unauthorized deletion attempts
  // Create a new connection without PM authorization
  const noAuthConnection: api.IConnection = { ...connection, headers: {} };

  // Attempt delete without authorization
  await TestValidator.error(
    "delete TPM without authorization should fail",
    async () => {
      await api.functional.taskManagement.pm.taskManagement.tpms.erase(
        noAuthConnection,
        {
          id: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
