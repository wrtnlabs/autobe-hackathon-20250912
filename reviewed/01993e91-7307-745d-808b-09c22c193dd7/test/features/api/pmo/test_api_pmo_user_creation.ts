import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementPmo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPmo";

export async function test_api_pmo_user_creation(connection: api.IConnection) {
  // Step 1: Join a PMO user to authenticate
  const initialJoinBody = {
    email: `${RandomGenerator.name(1).toLowerCase()}@example.com`,
    password: "SecurePass123!",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPmo.IJoin;
  const adminAuthorized = await api.functional.auth.pmo.join(connection, {
    body: initialJoinBody,
  });
  typia.assert(adminAuthorized);

  // Step 2: Create a new PMO user with a unique email
  const newPmoCreateBody = {
    email: `${RandomGenerator.name(1).toLowerCase()}@example.com`,
    password_hash: typia.random<string>(),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPmo.ICreate;

  const createdPmo =
    await api.functional.taskManagement.pmo.taskManagement.pmos.createPmo(
      connection,
      {
        body: newPmoCreateBody,
      },
    );
  typia.assert(createdPmo);
  TestValidator.equals(
    "created PMO email",
    createdPmo.email,
    newPmoCreateBody.email,
  );
  TestValidator.equals(
    "created PMO name",
    createdPmo.name,
    newPmoCreateBody.name,
  );

  // Step 3: Attempt to create PMO user with duplicate email to trigger error
  await TestValidator.error("duplicate email validation error", async () => {
    await api.functional.taskManagement.pmo.taskManagement.pmos.createPmo(
      connection,
      {
        body: {
          email: createdPmo.email,
          password_hash: typia.random<string>(),
          name: RandomGenerator.name(),
        } satisfies ITaskManagementPmo.ICreate,
      },
    );
  });

  // Step 4: Attempt to create PMO user with missing required fields
  // Since required properties cannot be omitted, test with empty strings
  await TestValidator.error(
    "missing required fields validation error",
    async () => {
      await api.functional.taskManagement.pmo.taskManagement.pmos.createPmo(
        connection,
        {
          body: {
            email: "",
            password_hash: "",
            name: "",
          } satisfies ITaskManagementPmo.ICreate,
        },
      );
    },
  );
}
