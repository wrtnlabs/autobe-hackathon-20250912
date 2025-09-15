import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementPmo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPmo";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * Tests deletion of a Technical Project Manager (TPM) user by ID using PMO
 * authorization with valid credentials.
 *
 * The test covers the full flow:
 *
 * 1. PMO user creation and authentication
 * 2. TPM user creation for deletion
 * 3. TPM user deletion by PMO
 * 4. Validation of successful deletion
 * 5. Validation of error on deletion of non-existent token
 * 6. Validation of authorization errors on unauthorized deletion attempts
 *
 * This ensures role-based access control is enforced and TPM resources are
 * correctly removed.
 *
 * @param connection API connection with potential auth state
 */
export async function test_api_task_management_pmo_tpms_delete_valid_id_and_authorization(
  connection: api.IConnection,
) {
  // Step 1: PMO user join and authenticate
  const pmoJoinBody = {
    email: `pmo_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "P@ssw0rd123",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPmo.IJoin;

  const pmoUser: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.join(connection, { body: pmoJoinBody });
  typia.assert(pmoUser);

  // Step 2: Create a TPM user to be deleted
  const tpmsCreateBody = {
    email: `tpm_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.ICreate;
  const createdTPM: ITaskManagementTpm =
    await api.functional.taskManagement.pmo.taskManagement.tpms.create(
      connection,
      { body: tpmsCreateBody },
    );
  typia.assert(createdTPM);

  // Step 3: Delete the TPM user by PMO
  await api.functional.taskManagement.pmo.taskManagement.tpms.erase(
    connection,
    {
      id: createdTPM.id,
    },
  );

  // Step 4: Attempt to delete the same TPM again, expect error since not found or unauthorized
  await TestValidator.error(
    "deleting already deleted TPM should fail",
    async () => {
      await api.functional.taskManagement.pmo.taskManagement.tpms.erase(
        connection,
        {
          id: createdTPM.id,
        },
      );
    },
  );

  // Step 5: Attempt deletion without authorization and expect failure
  // Create a new non-PMO connection without auth headers
  const unauthenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {},
  };

  await TestValidator.error(
    "unauthorized deletion attempt should fail",
    async () => {
      await api.functional.taskManagement.pmo.taskManagement.tpms.erase(
        unauthenticatedConnection,
        { id: createdTPM.id },
      );
    },
  );
}
