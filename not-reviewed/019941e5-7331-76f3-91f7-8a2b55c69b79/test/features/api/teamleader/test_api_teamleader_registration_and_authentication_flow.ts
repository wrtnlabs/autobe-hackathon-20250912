import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEasySignTeamLeader } from "@ORGANIZATION/PROJECT-api/lib/structures/IEasySignTeamLeader";

/**
 * This test validates the registration and authentication workflow for a
 * teamLeader user role.
 *
 * It covers:
 *
 * 1. Successful registration of a new teamLeader user with valid email, name,
 *    and explicitly null mobile phone.
 * 2. Successful login with correct credentials verifying token issuance.
 * 3. Error validation when attempting duplicate registration with the same
 *    email.
 * 4. Error validation when attempting login with incorrect password.
 *
 * All steps use proper DTO types and respect format constraints for emails
 * and optional fields. The test uses typia.assert to enforce complete
 * runtime validation of responses.
 *
 * This ensures robust validation of core authentication flows for
 * teamLeader users.
 */
export async function test_api_teamleader_registration_and_authentication_flow(
  connection: api.IConnection,
) {
  // 1. Register a new teamLeader user with realistic data
  const email = typia.random<string & tags.Format<"email">>();
  const createBody = {
    email,
    name: RandomGenerator.name(),
    mobile_phone: null,
  } satisfies IEasySignTeamLeader.ICreate;
  const joinOutput: IEasySignTeamLeader.IAuthorized =
    await api.functional.auth.teamLeader.join(connection, {
      body: createBody,
    });
  typia.assert(joinOutput);

  // 2. Login with correct credentials
  const loginBody = {
    email,
    password: "password123",
  } satisfies IEasySignTeamLeader.ILogin;
  const loginOutput: IEasySignTeamLeader.IAuthorized =
    await api.functional.auth.teamLeader.login(connection, {
      body: loginBody,
    });
  typia.assert(loginOutput);

  // 3. Duplicate join attempt with same email should fail
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      await api.functional.auth.teamLeader.join(connection, {
        body: createBody,
      });
    },
  );

  // 4. Login attempt with incorrect password should fail
  const wrongLoginBody = {
    email,
    password: "wrong_password",
  } satisfies IEasySignTeamLeader.ILogin;
  await TestValidator.error(
    "login with wrong password should fail",
    async () => {
      await api.functional.auth.teamLeader.login(connection, {
        body: wrongLoginBody,
      });
    },
  );
}
