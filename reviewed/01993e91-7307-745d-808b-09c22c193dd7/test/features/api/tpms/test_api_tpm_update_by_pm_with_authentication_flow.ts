import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementPm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPm";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * End-to-end test for TPM update operation by PM user with authentication and
 * authorization.
 *
 * Business flow:
 *
 * 1. Register PM user.
 * 2. Login PM user to get authorization tokens.
 * 3. Register TPM user.
 * 4. Login TPM user to get authorization tokens.
 * 5. Update TPM user using PM user's authorization.
 * 6. Validate the updated TPM user's data.
 * 7. Verify errors on invalid TPM user id update.
 * 8. Verify errors on unauthenticated update attempts.
 */
export async function test_api_tpm_update_by_pm_with_authentication_flow(
  connection: api.IConnection,
) {
  // Step 1: Register PM user
  const pmEmail: string = typia.random<string & tags.Format<"email">>();
  const pmJoinBody = {
    email: pmEmail,
    password: "securePassword123",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPm.ICreate;
  const pmAuthorized: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.join(connection, {
      body: pmJoinBody,
    });
  typia.assert(pmAuthorized);

  // Step 2: Login PM user
  const pmLoginBody = {
    email: pmEmail,
    password: "securePassword123",
  } satisfies ITaskManagementPm.ILogin;
  const pmLoggedIn: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.login(connection, {
      body: pmLoginBody,
    });
  typia.assert(pmLoggedIn);

  // Step 3: Register TPM user
  const tpmEmail: string = typia.random<string & tags.Format<"email">>();
  const tpmJoinBody = {
    email: tpmEmail,
    password: "tpmPassword456",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;
  const tpmAuthorized: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, {
      body: tpmJoinBody,
    });
  typia.assert(tpmAuthorized);

  // Step 4: Login TPM user
  const tpmLoginBody = {
    email: tpmEmail,
    password: "tpmPassword456",
  } satisfies ITaskManagementTpm.ILogin;
  const tpmLoggedIn: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.login(connection, {
      body: tpmLoginBody,
    });
  typia.assert(tpmLoggedIn);

  // Step 5: Perform PUT update on TPM user as PM user
  const updateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: typia.random<string>(),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IUpdate;

  const updatedTpm: ITaskManagementTpm =
    await api.functional.taskManagement.pm.taskManagement.tpms.update(
      connection,
      {
        id: tpmAuthorized.id,
        body: updateBody,
      },
    );
  typia.assert(updatedTpm);

  // Step 6: Validate updates
  TestValidator.equals(
    "updated TPM id matches original",
    updatedTpm.id,
    tpmAuthorized.id,
  );
  TestValidator.equals(
    "updated TPM email matches update body",
    updatedTpm.email,
    updateBody.email,
  );
  TestValidator.equals(
    "updated TPM name matches update body",
    updatedTpm.name,
    updateBody.name,
  );

  TestValidator.predicate(
    "updated TPM password_hash is updated and non-empty",
    typeof updatedTpm.password_hash === "string" &&
      updatedTpm.password_hash.length > 10,
  );

  // Step 7: Attempt update with invalid TPM id
  const fakeId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "update fails with invalid TPM user id",
    async () => {
      await api.functional.taskManagement.pm.taskManagement.tpms.update(
        connection,
        {
          id: fakeId,
          body: updateBody,
        },
      );
    },
  );

  // Step 8: Attempt update without authentication (using fresh connection with empty headers)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "unauthenticated update request fails",
    async () => {
      await api.functional.taskManagement.pm.taskManagement.tpms.update(
        unauthenticatedConnection,
        {
          id: tpmAuthorized.id,
          body: updateBody,
        },
      );
    },
  );
}
