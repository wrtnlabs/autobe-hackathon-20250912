import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementPmo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPmo";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * This E2E test function validates the creation and retrieval of PMO and TPM
 * users in the task management system.
 *
 * It performs the following sequence:
 *
 * 1. Registers and authenticates a PMO user to establish a valid security context.
 * 2. Creates a TPM user under the authorization of the PMO user.
 * 3. Validates the TPM user's returned information.
 * 4. Checks for error handling on TPM user creation with duplicate emails.
 */
export async function test_api_task_management_pmo_user_creation_and_retrieve(
  connection: api.IConnection,
) {
  // 1. Register and authenticate PMO user
  const pmoJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(2),
  } satisfies ITaskManagementPmo.IJoin;

  const pmoUser: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.join(connection, { body: pmoJoinBody });
  typia.assert(pmoUser);

  // 2. Create TPM user under PMO authorization
  // Generate valid TPM create data
  const tpmCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(20),
    name: RandomGenerator.name(2),
  } satisfies ITaskManagementTpm.ICreate;

  const tpmUser: ITaskManagementTpm =
    await api.functional.taskManagement.pmo.taskManagement.tpms.create(
      connection,
      { body: tpmCreateBody },
    );
  typia.assert(tpmUser);

  TestValidator.predicate(
    "PMO token should be a bearer access token string",
    typeof connection.headers !== "undefined" &&
      typeof connection.headers["Authorization"] === "string",
  );

  // Validate that TPM user returned has expected properties
  TestValidator.predicate(
    "TPM user ID is UUID",
    /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/.test(
      tpmUser.id,
    ),
  );
  TestValidator.equals(
    "TPM user name matches create request",
    tpmUser.name,
    tpmCreateBody.name,
  );
  TestValidator.equals(
    "TPM user email matches create request",
    tpmUser.email,
    tpmCreateBody.email,
  );

  // 3. Attempt to create TPM user with duplicate email, expect failure
  await TestValidator.error(
    "duplicate TPM email creation should fail",
    async () => {
      await api.functional.taskManagement.pmo.taskManagement.tpms.create(
        connection,
        {
          body: {
            email: tpmCreateBody.email,
            password_hash: RandomGenerator.alphaNumeric(20),
            name: RandomGenerator.name(2),
          } satisfies ITaskManagementTpm.ICreate,
        },
      );
    },
  );
}
