import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsDepartmentManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsDepartmentManager";
import type { IEnterpriseLmsSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSessions";

/**
 * E2E test of updating a department manager LMS user session with
 * authentication.
 *
 * This test covers the entire flow of a department manager registering,
 * logging in, obtaining authorization tokens, and updating their active
 * session information including session token, IP address, device info, and
 * expiry times.
 *
 * The test asserts the correctness of the update response and verifies that
 * business rules such as tenant ID and user ID matching are enforced.
 *
 * Steps:
 *
 * 1. Register a new department manager with valid info.
 * 2. Log in with the newly created department manager credentials.
 * 3. Perform a session update with valid tenant and user IDs.
 * 4. Confirm that the session has been updated accordingly.
 * 5. Attempt invalid updates and assert errors.
 */
export async function test_api_departmentmanager_session_update_with_authentication(
  connection: api.IConnection,
) {
  // 1. Register a new department manager
  const createBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsDepartmentManager.ICreate;

  const created: IEnterpriseLmsDepartmentManager.IAuthorized =
    await api.functional.auth.departmentManager.join(connection, {
      body: createBody,
    });
  typia.assert(created);

  // 2. Authenticate the department manager
  const loginBody = {
    email: createBody.email,
    password: createBody.password,
  } satisfies IEnterpriseLmsDepartmentManager.ILogin;

  const loggedIn: IEnterpriseLmsDepartmentManager.IAuthorized =
    await api.functional.auth.departmentManager.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedIn);

  // 3. Prepare a session update payload
  const updateBody = {
    enterprise_lms_tenant_id: created.tenant_id,
    user_id: created.id,
    session_token: RandomGenerator.alphaNumeric(32),
    ip_address: RandomGenerator.alphaNumeric(12),
    device_info: RandomGenerator.alphaNumeric(16),
    expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(), // valid future timestamp
  } satisfies IEnterpriseLmsSessions.IUpdate;

  // Note: Using random UUID as session id, no API available to get existing session
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  // 4. Update the session with valid data
  const updatedSession: IEnterpriseLmsSessions =
    await api.functional.enterpriseLms.departmentManager.sessions.update(
      connection,
      {
        id: sessionId,
        body: updateBody,
      },
    );
  typia.assert(updatedSession);

  // Validate the updated session fields
  TestValidator.equals(
    "tenant ID matches request",
    updatedSession.enterprise_lms_tenant_id,
    updateBody.enterprise_lms_tenant_id,
  );
  TestValidator.equals(
    "user ID matches request",
    updatedSession.user_id,
    updateBody.user_id,
  );
  TestValidator.equals(
    "session token matches request",
    updatedSession.session_token,
    updateBody.session_token,
  );

  // Validate ISO date format and future expiration
  TestValidator.predicate(
    "expiration timestamp is valid ISO string",
    typeof updatedSession.expires_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(
        updatedSession.expires_at,
      ),
  );

  const expiresDate = new Date(updatedSession.expires_at);
  TestValidator.predicate(
    "expiration is in the future",
    expiresDate.getTime() > Date.now(),
  );

  // 5. Attempt to update with invalid tenant ID (bad authorization)
  await TestValidator.error(
    "updating session with invalid tenant ID should fail",
    async () => {
      await api.functional.enterpriseLms.departmentManager.sessions.update(
        connection,
        {
          id: sessionId,
          body: {
            ...updateBody,
            enterprise_lms_tenant_id: typia.random<
              string & tags.Format<"uuid">
            >(), // wrong tenant
          },
        },
      );
    },
  );

  // 6. Attempt to update with invalid user ID (bad authorization)
  await TestValidator.error(
    "updating session with invalid user ID should fail",
    async () => {
      await api.functional.enterpriseLms.departmentManager.sessions.update(
        connection,
        {
          id: sessionId,
          body: {
            ...updateBody,
            user_id: typia.random<string & tags.Format<"uuid">>(), // wrong user id
          },
        },
      );
    },
  );
}
