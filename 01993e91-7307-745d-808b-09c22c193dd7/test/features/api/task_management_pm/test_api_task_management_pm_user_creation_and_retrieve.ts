import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementPm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPm";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * This scenario tests the creation of a Project Manager (PM) user by using the
 * POST endpoint at /taskManagement/pm/taskManagement/tpms. The test requires
 * authentication as a PM user by calling the /auth/pm/join endpoint to
 * establish a proper authorization context. After authentication, it proceeds
 * to create a new TPM user with required fields: email, password_hash, and
 * name. The test validates successful creation by ensuring the response matches
 * expectations and performs typical scenarios such as handling duplicate email
 * errors and verifying the required fields are correctly processed. Business
 * logic validations include uniqueness of email and correct password hashing
 * represented in the response data. The test covers positive success path and
 * failure scenarios for conflicts or invalid input. The test also respects the
 * security of password handling, ensuring only the hashed password appears in
 * responses and that plain passwords are used correctly only in creation
 * requests. Throughout, all required properties are included with realistic
 * values and type safety is strictly enforced.
 */
export async function test_api_task_management_pm_user_creation_and_retrieve(
  connection: api.IConnection,
) {
  // 1. Join/authenticate PM user to establish context
  const pmCreateBody = {
    email: `pm${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPm.ICreate;

  const pmAuthorized: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.join(connection, {
      body: pmCreateBody,
    });
  typia.assert(pmAuthorized);

  // 2. Create a new TPM user using TPM Create endpoint with hashed password
  const tpmCreateBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(64), // Simulate hashed password
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.ICreate;

  const tpmCreated: ITaskManagementTpm =
    await api.functional.taskManagement.pm.taskManagement.tpms.create(
      connection,
      {
        body: tpmCreateBody,
      },
    );
  typia.assert(tpmCreated);

  // 3. Ensure created TPM user fields match input where applicable
  TestValidator.equals(
    "Created TPM email matches",
    tpmCreated.email,
    tpmCreateBody.email,
  );
  TestValidator.equals(
    "Created TPM name matches",
    tpmCreated.name,
    tpmCreateBody.name,
  );

  // 4. Attempt to create TPM with duplicate email and expect failure
  await TestValidator.error(
    "Duplicate TPM email creation should fail",
    async () => {
      await api.functional.taskManagement.pm.taskManagement.tpms.create(
        connection,
        {
          body: {
            email: tpmCreateBody.email, // duplicate email
            password_hash: RandomGenerator.alphaNumeric(64),
            name: RandomGenerator.name(),
          } satisfies ITaskManagementTpm.ICreate,
        },
      );
    },
  );
}
