import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementPm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPm";

/**
 * Validate authorized retrieval of PM user by ID.
 *
 * This test covers the end-to-end scenario of authentication, PM user creation,
 * authorized retrieval, and error handling for invalid or unauthorized access.
 * It uses realistic random data and strict schema validations.
 */
export async function test_api_task_management_pm_pms_get_by_id_with_authorization(
  connection: api.IConnection,
) {
  // 1. Authenticate as PM user via join
  const pmJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPm.ICreate;

  const joinedPm: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.join(connection, { body: pmJoinBody });
  typia.assert(joinedPm);

  // 2. Create a PM user for retrieval
  const createBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPm.ICreate;

  const createdPm: ITaskManagementPm =
    await api.functional.taskManagement.pm.taskManagement.pms.create(
      connection,
      { body: createBody },
    );
  typia.assert(createdPm);

  // 3. Retrieve the created PM user by ID
  const retrievedPm: ITaskManagementPm =
    await api.functional.taskManagement.pm.taskManagement.pms.at(connection, {
      id: createdPm.id,
    });
  typia.assert(retrievedPm);

  // 4. Assert retrieval data matches creation (note omitted password_hash check as it comes from DB)
  TestValidator.equals(
    "retrieved PM ID matches created",
    retrievedPm.id,
    createdPm.id,
  );
  TestValidator.equals(
    "retrieved PM email matches created",
    retrievedPm.email,
    createdPm.email,
  );
  TestValidator.equals(
    "retrieved PM name matches created",
    retrievedPm.name,
    createdPm.name,
  );

  // The created and retrieved password_hash may differ because hashing process may add salt,
  // so just test password_hash existence in retrieved, and that it is a string
  TestValidator.predicate(
    "retrieved PM password_hash is string",
    typeof retrievedPm.password_hash === "string" &&
      retrievedPm.password_hash.length > 0,
  );

  // deleted_at nullable, assert type for presence or explicit null
  TestValidator.predicate(
    "retrieved PM deleted_at is null or string",
    retrievedPm.deleted_at === null ||
      typeof retrievedPm.deleted_at === "string" ||
      retrievedPm.deleted_at === undefined,
  );

  // 5. Test retrieval with invalid ID should error
  const invalidId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "retrieve PM with non-existent ID should throw",
    async () => {
      await api.functional.taskManagement.pm.taskManagement.pms.at(connection, {
        id: invalidId,
      });
    },
  );

  // 6. Test unauthorized request is rejected
  // Create unauthenticated connection by empty headers object
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthorized retrieval should throw", async () => {
    await api.functional.taskManagement.pm.taskManagement.pms.at(unauthConn, {
      id: createdPm.id,
    });
  });
}
