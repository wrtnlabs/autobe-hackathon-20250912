import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDeveloper";
import type { ITaskManagementPmo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPmo";

/**
 * This test function validates the update operation of developer user
 * information by a PMO (Project Management Officer) user.
 *
 * Workflow:
 *
 * 1. Register a PMO user via /auth/pmo/join with valid email, password, and
 *    name.
 * 2. Login as the PMO user via /auth/pmo/login to obtain valid authorization
 *    context.
 * 3. Create a developer user initially by invoking the update endpoint with a
 *    new UUID and initial data (simulate creation).
 * 4. Update the developer with new valid data (email, name, password_hash) as
 *    PMO user.
 * 5. Assert that the updated developer data matches the input and returned
 *    data strictly following DTO schema.
 * 6. Test negative scenarios: a. Attempt update with duplicate email and
 *    expect error. b. Attempt update by unauthorized connection and expect
 *    error. c. Attempt update of soft-deleted developer and expect error.
 * 7. All API calls await completion, utilize proper type assertion with typia,
 *    and validate business logic.
 */
export async function test_api_developer_update_by_pmo_user(
  connection: api.IConnection,
) {
  // 1. PMO user joins
  const pmoJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(2),
  } satisfies ITaskManagementPmo.IJoin;
  const pmoUser: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.join(connection, { body: pmoJoinBody });
  typia.assert(pmoUser);

  // 2. PMO user login
  const pmoLoginBody = {
    email: pmoJoinBody.email,
    password: pmoJoinBody.password,
  } satisfies ITaskManagementPmo.ILogin;
  const pmoUserLogin: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.login(connection, { body: pmoLoginBody });
  typia.assert(pmoUserLogin);

  // 3. Create a developer user by PUT with a new UUID
  const developerId = typia.random<string & tags.Format<"uuid">>();
  const initialDeveloperData = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(2),
    password_hash: RandomGenerator.alphaNumeric(32),
  } satisfies ITaskManagementDeveloper.IUpdate;

  const createdDeveloper =
    await api.functional.taskManagement.pmo.taskManagement.developers.update(
      connection,
      {
        id: developerId,
        body: initialDeveloperData,
      },
    );
  typia.assert(createdDeveloper);
  TestValidator.equals(
    "created developer id",
    createdDeveloper.id,
    developerId,
  );
  TestValidator.equals(
    "created developer email",
    createdDeveloper.email,
    initialDeveloperData.email,
  );
  TestValidator.equals(
    "created developer name",
    createdDeveloper.name,
    initialDeveloperData.name,
  );

  // 4. Update the developer info
  const updatedDeveloperData = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(3),
    password_hash: RandomGenerator.alphaNumeric(40),
  } satisfies ITaskManagementDeveloper.IUpdate;

  const updatedDeveloper =
    await api.functional.taskManagement.pmo.taskManagement.developers.update(
      connection,
      {
        id: developerId,
        body: updatedDeveloperData,
      },
    );
  typia.assert(updatedDeveloper);
  TestValidator.equals(
    "updated developer id",
    updatedDeveloper.id,
    developerId,
  );
  TestValidator.equals(
    "updated developer email",
    updatedDeveloper.email,
    updatedDeveloperData.email,
  );
  TestValidator.equals(
    "updated developer name",
    updatedDeveloper.name,
    updatedDeveloperData.name,
  );

  // 5. Negative test: duplicate email update should fail
  const anotherDeveloperId = typia.random<string & tags.Format<"uuid">>();
  // Create another developer to get an email to duplicate
  const anotherDevData = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(2),
    password_hash: RandomGenerator.alphaNumeric(32),
  } satisfies ITaskManagementDeveloper.IUpdate;

  const anotherDev =
    await api.functional.taskManagement.pmo.taskManagement.developers.update(
      connection,
      {
        id: anotherDeveloperId,
        body: anotherDevData,
      },
    );
  typia.assert(anotherDev);

  // Attempt to update the first developer with the duplicate email
  await TestValidator.error("update with duplicate email fails", async () => {
    await api.functional.taskManagement.pmo.taskManagement.developers.update(
      connection,
      {
        id: developerId,
        body: {
          email: anotherDevData.email, // duplicate
        } satisfies ITaskManagementDeveloper.IUpdate,
      },
    );
  });

  // 6. Negative test: unauthorized update attempt
  // Create a fresh connection to simulate no auth
  const unauthorizedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error("unauthorized update attempt fails", async () => {
    await api.functional.taskManagement.pmo.taskManagement.developers.update(
      unauthorizedConnection,
      {
        id: developerId,
        body: {
          name: "Unauthorized Update",
        } satisfies ITaskManagementDeveloper.IUpdate,
      },
    );
  });

  // 7. Negative test: update soft-deleted developer should fail
  const softDeletedDeveloperId = typia.random<string & tags.Format<"uuid">>();
  // Simulate soft-deleted developer creation
  const softDeletedDeveloperData = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(2),
    password_hash: RandomGenerator.alphaNumeric(32),
    deleted_at: new Date().toISOString(),
  } satisfies ITaskManagementDeveloper.IUpdate;

  // Attempt to create soft-deleted developer
  const softDeletedDeveloper =
    await api.functional.taskManagement.pmo.taskManagement.developers.update(
      connection,
      {
        id: softDeletedDeveloperId,
        body: softDeletedDeveloperData,
      },
    );
  typia.assert(softDeletedDeveloper);
  // Try to update soft-deleted developer
  await TestValidator.error(
    "update of soft-deleted developer fails",
    async () => {
      await api.functional.taskManagement.pmo.taskManagement.developers.update(
        connection,
        {
          id: softDeletedDeveloperId,
          body: {
            name: "Should not update",
          } satisfies ITaskManagementDeveloper.IUpdate,
        },
      );
    },
  );
}
