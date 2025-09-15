import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerDeveloper";

/**
 * This test scenario verifies that an authenticated developer can update their
 * own developer profile successfully. It performs developer registration, login
 * to obtain authentication context, then updates mutable fields on the
 * developer profile via the update endpoint. It asserts that update is applied
 * correctly and validates immutable fields. Error scenarios are omitted per
 * instructions.
 */
export async function test_api_oauth_server_developer_update_success_with_developer_authentication(
  connection: api.IConnection,
) {
  // 1. Generate reusable test data for developer
  const email = typia.random<string & tags.Format<"email">>();
  const plaintextPassword = RandomGenerator.alphaNumeric(12);

  // 2. Join developer with email, email_verified false, and password_hash set as plaintextPassword
  const createDeveloperBody = {
    email,
    email_verified: false,
    password_hash: plaintextPassword,
  } satisfies IOauthServerDeveloper.ICreate;

  const createdDeveloper: IOauthServerDeveloper.IAuthorized =
    await api.functional.auth.developer.join(connection, {
      body: createDeveloperBody,
    });
  typia.assert(createdDeveloper);

  // 3. Login as developer with matching email and plaintextPassword
  const loginDeveloperBody = {
    email,
    password: plaintextPassword,
  } satisfies IOauthServerDeveloper.ILogin;

  const authorizedDeveloper: IOauthServerDeveloper.IAuthorized =
    await api.functional.auth.developer.login(connection, {
      body: loginDeveloperBody,
    });
  typia.assert(authorizedDeveloper);

  // 4. Prepare update data - set email_verified true and new random password_hash
  const updateBody = {
    email_verified: true,
    password_hash: RandomGenerator.alphaNumeric(64),
  } satisfies IOauthServerDeveloper.IUpdate;

  // 5. Update developer profile via update endpoint with authenticated developer id
  const updatedDeveloper: IOauthServerDeveloper =
    await api.functional.oauthServer.developer.oauthServerDevelopers.update(
      connection,
      {
        id: authorizedDeveloper.id,
        body: updateBody,
      },
    );
  typia.assert(updatedDeveloper);

  // 6. Assertion of updated fields matching update request
  TestValidator.equals(
    "email_verified updated",
    updatedDeveloper.email_verified,
    updateBody.email_verified!,
  );
  TestValidator.equals(
    "password_hash updated",
    updatedDeveloper.password_hash,
    updateBody.password_hash!,
  );

  // 7. Assert immutable fields remain unchanged
  TestValidator.equals(
    "id should remain unchanged",
    updatedDeveloper.id,
    authorizedDeveloper.id,
  );
  TestValidator.equals(
    "email should remain unchanged",
    updatedDeveloper.email,
    authorizedDeveloper.email,
  );

  // 8. Assert timestamps: updated_at changed, created_at unchanged
  TestValidator.predicate(
    "updated_at is different",
    updatedDeveloper.updated_at !== authorizedDeveloper.updated_at,
  );
  TestValidator.predicate(
    "created_at remains same",
    updatedDeveloper.created_at === authorizedDeveloper.created_at,
  );
}
