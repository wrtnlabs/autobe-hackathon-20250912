import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementQa } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementQa";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * Test updating a Quality Assurance (QA) user by TPM user.
 *
 * This test covers the update operation of a QA user. It performs the
 * following steps:
 *
 * 1. Register a new TPM user account.
 * 2. Log in as the TPM user to gain authorized context.
 * 3. Use a generated QA user ID and update its record via the update endpoint.
 * 4. Assert updated properties are reflected correctly.
 *
 * Note: QA user creation is assumed to be done as a dependency or fixture.
 */
export async function test_api_qa_update_by_tpm_user(
  connection: api.IConnection,
) {
  // 1. TPM user join
  const joinBody = {
    email: RandomGenerator.alphaNumeric(10) + "@qatesting.com",
    password: "StrongPass!2025",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;

  const tpmAuthorized: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, { body: joinBody });
  typia.assert(tpmAuthorized);

  // 2. TPM user login
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
  } satisfies ITaskManagementTpm.ILogin;

  const tpmLoggedIn: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.login(connection, { body: loginBody });
  typia.assert(tpmLoggedIn);

  // 3. Prepare QA user id for update
  // Since no QA user creation API provided, we assume an existing QA user ID
  const qaUserId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 4. Prepare update payload for QA user
  const updateBody = {
    updated_at: new Date().toISOString(), // ISO 8601 date-time format
  } satisfies ITaskManagementQa.IUpdate;

  // 5. Call the update API
  const updatedQaUser: ITaskManagementQa =
    await api.functional.taskManagement.tpm.taskManagement.qas.update(
      connection,
      {
        id: qaUserId,
        body: updateBody,
      },
    );
  typia.assert(updatedQaUser);

  // 6. Validate response data matches update
  TestValidator.equals(
    "QA user ID matches update request",
    updatedQaUser.id,
    qaUserId,
  );
  TestValidator.equals(
    "QA user updated_at should match updated time",
    updatedQaUser.updated_at,
    updateBody.updated_at!,
  );
}
