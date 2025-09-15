import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementPm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPm";

/**
 * E2E Test: Update Project Manager user data with authorization and
 * validations.
 *
 * This test registers a PM user, logs in to receive authorization tokens, then
 * updates the PM user's info. It verifies successful updates, rejects duplicate
 * email attempts, and denies updating without proper authorization. The test
 * also checks partial updates and data integrity.
 *
 * Test Steps:
 *
 * 1. Register PM user.
 * 2. Login as PM user.
 * 3. Update PM user with valid data.
 * 4. Validate update response data.
 * 5. Test duplicate email update rejection.
 * 6. Test update attempt without authorization.
 * 7. Test partial update success.
 */
export async function test_api_project_manager_update_with_authorization_and_data_validation(
  connection: api.IConnection,
) {
  // Step 1: Register a PM user for authorization context
  const pmCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPm.ICreate;

  const pmAuth: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.join(connection, { body: pmCreateBody });
  typia.assert(pmAuth);

  // Step 2: Login as PM user to obtain authorization
  const pmLoginBody = {
    email: pmCreateBody.email,
    password: pmCreateBody.password,
  } satisfies ITaskManagementPm.ILogin;

  const pmLogin: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.login(connection, { body: pmLoginBody });
  typia.assert(pmLogin);

  // Step 3: Update PM user with valid new data
  // We must update using the id of the authorized PM user
  const updatedEmail = typia.random<string & tags.Format<"email">>();
  const updatedName = RandomGenerator.name();
  const updatedPasswordHash = typia.random<string>();

  const updateBody = {
    email: updatedEmail,
    name: updatedName,
    password_hash: updatedPasswordHash,
  } satisfies ITaskManagementPm.IUpdate;

  const updatedPM: ITaskManagementPm =
    await api.functional.taskManagement.pm.taskManagement.pms.update(
      connection,
      { id: pmLogin.id, body: updateBody },
    );
  typia.assert(updatedPM);

  // Step 4: Validate that response has updated fields and required timestamps
  TestValidator.equals(
    "updated email matches",
    updatedPM.email,
    updateBody.email,
  );
  TestValidator.equals("updated name matches", updatedPM.name, updateBody.name);
  TestValidator.equals(
    "password_hash updated",
    updatedPM.password_hash,
    updateBody.password_hash,
  );
  // Validate that created_at and updated_at are strings (ISO datetime)
  TestValidator.predicate(
    "created_at is ISO date-time string",
    typeof updatedPM.created_at === "string" &&
      !isNaN(Date.parse(updatedPM.created_at)),
  );
  TestValidator.predicate(
    "updated_at is ISO date-time string",
    typeof updatedPM.updated_at === "string" &&
      !isNaN(Date.parse(updatedPM.updated_at)),
  );

  // deleted_at may be null or undefined, check if explicitly set to null or undefined
  if (updatedPM.deleted_at !== null && updatedPM.deleted_at !== undefined) {
    TestValidator.predicate(
      "deleted_at is ISO date-time string if present",
      typeof updatedPM.deleted_at === "string" &&
        !isNaN(Date.parse(updatedPM.deleted_at)),
    );
  }

  // Step 5: Test update with duplicate email (using existing email) to confirm validation error
  // We try to update pmLogin user with email of pmCreateBody email which is same
  await TestValidator.error("update fails with duplicate email", async () => {
    await api.functional.taskManagement.pm.taskManagement.pms.update(
      connection,
      {
        id: pmLogin.id,
        body: {
          email: pmCreateBody.email, // duplicate email
        } satisfies ITaskManagementPm.IUpdate,
      },
    );
  });

  // Step 6: Test update attempt without authorization
  // Create new connection without Authorization header
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "update rejected without authorization",
    async () => {
      await api.functional.taskManagement.pm.taskManagement.pms.update(
        unauthenticatedConnection,
        {
          id: pmLogin.id,
          body: {
            name: RandomGenerator.name(),
          } satisfies ITaskManagementPm.IUpdate,
        },
      );
    },
  );

  // Step 7: Test partial update (only name) and confirm data integrity
  const partialUpdateBody = {
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPm.IUpdate;

  const partiallyUpdatedPM: ITaskManagementPm =
    await api.functional.taskManagement.pm.taskManagement.pms.update(
      connection,
      { id: pmLogin.id, body: partialUpdateBody },
    );
  typia.assert(partiallyUpdatedPM);

  TestValidator.equals(
    "partial update name matches",
    partiallyUpdatedPM.name,
    partialUpdateBody.name,
  );

  // The email and password_hash should remain as last updated
  TestValidator.equals(
    "partial update retains email",
    partiallyUpdatedPM.email,
    updatedEmail,
  );
  TestValidator.equals(
    "partial update retains password_hash",
    partiallyUpdatedPM.password_hash,
    updatedPasswordHash,
  );
}
