import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementPm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPm";
import type { ITaskManagementTaskStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatus";

/**
 * Comprehensive E2E test for task status creation secured under PM
 * authentication.
 *
 * This test validates the entire workflow of task status management for
 * Project Manager users, from registering a new PM user to logging in and
 * using the issued credentials to create and verify task statuses.
 *
 * The test covers:
 *
 * 1. PM user registration
 * 2. PM user login
 * 3. Creating a valid new task status with unique code and name
 * 4. Validation of response schema correctness
 * 5. Attempt to create a task status with a duplicate code and expect failure
 * 6. Attempt to create statuses with empty or special character codes to
 *    validate business input rules
 *
 * This ensures strong authorization enforcement, business rule compliance,
 * and data integrity for the task status entity.
 */
export async function test_api_task_management_task_status_creation_pm_auth(
  connection: api.IConnection,
) {
  // Step 1: PM user registration
  const pmCreateBody = {
    email: `pmuser_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "SecurePass123!",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPm.ICreate;

  const pmUser: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.join(connection, {
      body: pmCreateBody,
    });
  typia.assert(pmUser);

  // Step 2: PM user login
  const pmLoginBody = {
    email: pmCreateBody.email,
    password: pmCreateBody.password,
  } satisfies ITaskManagementPm.ILogin;

  const pmLoggedIn: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.login(connection, {
      body: pmLoginBody,
    });
  typia.assert(pmLoggedIn);

  // Step 3: Create a valid new task status
  const uniqueCode = `status_${RandomGenerator.alphaNumeric(6)}`;
  const createBody = {
    code: uniqueCode,
    name: RandomGenerator.name(2),
    description: "A status created during automated test.",
  } satisfies ITaskManagementTaskStatus.ICreate;

  const createdStatus: ITaskManagementTaskStatus =
    await api.functional.taskManagement.pm.taskManagementTaskStatuses.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(createdStatus);

  TestValidator.equals(
    "Created code matches",
    createdStatus.code,
    createBody.code,
  );
  TestValidator.equals(
    "Created name matches",
    createdStatus.name,
    createBody.name,
  );
  TestValidator.equals(
    "Created description matches",
    createdStatus.description ?? null,
    createBody.description ?? null,
  );

  // Step 4: Attempt to create a duplicate code task status
  await TestValidator.error("Creating duplicate code should fail", async () => {
    await api.functional.taskManagement.pm.taskManagementTaskStatuses.create(
      connection,
      {
        body: {
          code: uniqueCode,
          name: RandomGenerator.name(2),
          description: "Duplicate code test",
        } satisfies ITaskManagementTaskStatus.ICreate,
      },
    );
  });

  // Step 5: Attempt to create with empty string for code and name
  await TestValidator.error(
    "Creating with empty code should fail",
    async () => {
      await api.functional.taskManagement.pm.taskManagementTaskStatuses.create(
        connection,
        {
          body: {
            code: "",
            name: RandomGenerator.name(2),
            description: null,
          } satisfies ITaskManagementTaskStatus.ICreate,
        },
      );
    },
  );

  await TestValidator.error(
    "Creating with empty name should fail",
    async () => {
      await api.functional.taskManagement.pm.taskManagementTaskStatuses.create(
        connection,
        {
          body: {
            code: `code_${RandomGenerator.alphaNumeric(4)}`,
            name: "",
            description: null,
          } satisfies ITaskManagementTaskStatus.ICreate,
        },
      );
    },
  );

  // Step 6: Attempt to create with special characters in code
  await TestValidator.error(
    "Creating with special characters in code should fail",
    async () => {
      await api.functional.taskManagement.pm.taskManagementTaskStatuses.create(
        connection,
        {
          body: {
            code: "!@#$%^&*()",
            name: RandomGenerator.name(2),
            description: null,
          } satisfies ITaskManagementTaskStatus.ICreate,
        },
      );
    },
  );
}
