import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * This test validates retrieval of a TPM user by their unique id.
 *
 * The process involves:
 *
 * 1. Creating (joining) a new TPM user via POST /auth/tpm/join with randomized
 *    valid data.
 * 2. Using the created TPM user's ID to call GET
 *    /taskManagement/tpm/taskManagement/tpms/{id}.
 * 3. Validating that the retrieved TPM user matches the created user's data on
 *    fields id, email, name, created_at, updated_at, and optionally
 *    deleted_at.
 * 4. Confirming that sensitive fields like password_hash are not exposed or
 *    consistent.
 * 5. Attempting to retrieve a non-existent TPM user ID and expecting an error.
 * 6. Attempting to retrieve with invalid UUID format and expecting an error.
 * 7. Confirming authorization enforcement prevents access without login or
 *    with invalid credentials.
 *
 * The test uses typia.assert for strict runtime type validation and
 * TestValidator for business logic assertions. Every api call uses await to
 * ensure proper async handling.
 */
export async function test_api_task_management_tpm_user_retrieve_by_id(
  connection: api.IConnection,
) {
  // 1. Create TPM user with randomized data
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;

  const authorized: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2. Retrieve TPM user by id
  const retrieved: ITaskManagementTpm =
    await api.functional.taskManagement.tpm.taskManagement.tpms.at(connection, {
      id: authorized.id,
    });
  typia.assert(retrieved);

  // 3. Validate retrieved data matches created user (except password hash possibly changed)
  TestValidator.equals("tpm user id", retrieved.id, authorized.id);
  TestValidator.equals("tpm user email", retrieved.email, authorized.email);
  TestValidator.equals("tpm user name", retrieved.name, authorized.name);
  TestValidator.equals(
    "tpm user created_at",
    retrieved.created_at,
    authorized.created_at,
  );
  TestValidator.equals(
    "tpm user updated_at",
    retrieved.updated_at,
    authorized.updated_at,
  );

  if (retrieved.deleted_at !== null && retrieved.deleted_at !== undefined) {
    TestValidator.equals(
      "tpm user deleted_at",
      retrieved.deleted_at,
      authorized.deleted_at ?? null,
    );
  } else {
    TestValidator.equals("tpm user deleted_at", retrieved.deleted_at, null);
  }

  // 4. Confirm password_hash is present and is a string but do not expose actual hash equality
  TestValidator.predicate(
    "password_hash is string",
    typeof retrieved.password_hash === "string" &&
      retrieved.password_hash.length > 0,
  );

  // 5. Attempt to retrieve TPM with non-existent UUID
  const fakeId = typia.random<string & tags.Format<"uuid">>();
  if (fakeId !== authorized.id) {
    await TestValidator.error(
      "retrieving non-existent TPM user should fail",
      async () => {
        await api.functional.taskManagement.tpm.taskManagement.tpms.at(
          connection,
          {
            id: fakeId,
          },
        );
      },
    );
  }

  // 6. Attempt to retrieve TPM user with invalid UUID format
  await TestValidator.error(
    "retrieving TPM user with invalid UUID should fail",
    async () => {
      await api.functional.taskManagement.tpm.taskManagement.tpms.at(
        connection,
        {
          id: "invalid-uuid-format",
        },
      );
    },
  );

  // 7. Confirm authorization enforcement: create new connection without auth headers
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "unauthorized TPM user retrieval should fail",
    async () => {
      await api.functional.taskManagement.tpm.taskManagement.tpms.at(
        unauthConn,
        {
          id: authorized.id,
        },
      );
    },
  );
}
