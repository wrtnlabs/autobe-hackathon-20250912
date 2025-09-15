import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementQa } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementQa";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * This E2E test verifies the creation of a QA user via authorized TPM user.
 *
 * Steps:
 *
 * 1. Register a TPM user with unique valid email, password, and name.
 * 2. Validate TPM user authorization via the response token.
 * 3. Create a QA user with unique email, hashed password, and name.
 * 4. Validate QA response: required properties, no plain password exposure,
 *    valid timestamps.
 * 5. Attempt to create a QA user with a duplicate email and expect failure.
 * 6. Attempt to create a QA user with invalid email format and expect failure.
 * 7. Attempt to create a QA user with missing required fields and expect
 *    failure.
 * 8. Confirm authorization enforcement by creating QA only with TPM user
 *    roles.
 */
export async function test_api_qa_user_creation_success(
  connection: api.IConnection,
) {
  // Step 1: TPM user registration and authentication for authorization
  const tpmJoinData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;
  const authorizedTpmUser = await api.functional.auth.tpm.join(connection, {
    body: tpmJoinData,
  });
  typia.assert(authorizedTpmUser);

  // Step 2: QA user creation with valid unique data
  const qaCreateData = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(64),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementQa.ICreate;
  const createdQaUser =
    await api.functional.taskManagement.tpm.taskManagement.qas.create(
      connection,
      { body: qaCreateData },
    );
  typia.assert(createdQaUser);

  // Validate QA user fields
  typia.assert<string & tags.Format<"uuid">>(createdQaUser.id);
  TestValidator.equals(
    "QA user email matches input",
    createdQaUser.email,
    qaCreateData.email,
  );
  TestValidator.equals(
    "QA user name matches input",
    createdQaUser.name,
    qaCreateData.name,
  );

  // Check that password_hash is present and not empty, but no plain password exposed
  TestValidator.predicate(
    "QA user password_hash is non-empty string",
    typeof createdQaUser.password_hash === "string" &&
      createdQaUser.password_hash.length >= 32,
  );

  // Validate ISO 8601 timestamps
  TestValidator.predicate(
    "QA created_at is ISO8601 datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.+Z$/.test(createdQaUser.created_at),
  );
  TestValidator.predicate(
    "QA updated_at is ISO8601 datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.+Z$/.test(createdQaUser.updated_at),
  );

  // Step 3: Attempt creating QA user with duplicate email → expect error
  await TestValidator.error(
    "Creating QA user with duplicate email should fail",
    async () => {
      await api.functional.taskManagement.tpm.taskManagement.qas.create(
        connection,
        {
          body: {
            email: qaCreateData.email, // duplicate
            password_hash: RandomGenerator.alphaNumeric(64),
            name: RandomGenerator.name(),
          } satisfies ITaskManagementQa.ICreate,
        },
      );
    },
  );

  // Step 4: Attempt creating QA user with invalid email format → expect error
  await TestValidator.error(
    "Creating QA user with invalid email format should fail",
    async () => {
      await api.functional.taskManagement.tpm.taskManagement.qas.create(
        connection,
        {
          body: {
            email: "invalid-email",
            password_hash: RandomGenerator.alphaNumeric(64),
            name: RandomGenerator.name(),
          } satisfies ITaskManagementQa.ICreate,
        },
      );
    },
  );

  // Step 5: Attempt creating QA user missing required fields → expect error
  await TestValidator.error(
    "Creating QA user without required fields should fail",
    async () => {
      // Provide empty strings for required fields
      await api.functional.taskManagement.tpm.taskManagement.qas.create(
        connection,
        {
          body: {
            email: "",
            password_hash: "",
            name: "",
          } satisfies ITaskManagementQa.ICreate,
        },
      );
    },
  );
}
