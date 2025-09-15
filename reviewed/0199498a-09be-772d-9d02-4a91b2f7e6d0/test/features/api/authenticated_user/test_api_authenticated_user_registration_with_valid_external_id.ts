import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IStoryfieldAiAuthenticatedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiAuthenticatedUser";

/**
 * Test the StoryField AI onboarding for an authenticatedUser using valid
 * external credentials.
 *
 * This test covers both success and error cases:
 *
 * - Successful registration with unique, verified external_user_id and
 *   business-unique email
 * - Duplicate registration attempts (same external_user_id or email) are rejected
 * - Invalid credentials and injection attempts are rejected with business errors
 *   (no type error testing)
 *
 * Steps:
 *
 * 1. Register a user with unique valid credentials.
 * 2. Validate response has correct fields, audit marks, and valid JWT token.
 * 3. Attempt registration with duplicate external_user_id -> expect business rule
 *    rejection.
 * 4. Attempt registration with duplicate email -> expect business rule rejection.
 * 5. Attempt registration with suspicious/injection strings in input -> expect
 *    rejection.
 */
export async function test_api_authenticated_user_registration_with_valid_external_id(
  connection: api.IConnection,
) {
  // 1. Register new authenticated user
  const external_user_id = RandomGenerator.alphaNumeric(24);
  const email = `${RandomGenerator.alphaNumeric(8)}@businessdomain.com`;
  const createBody = {
    external_user_id,
    email,
    actor_type: "authenticatedUser",
  } satisfies IStoryfieldAiAuthenticatedUser.ICreate;
  const session = await api.functional.auth.authenticatedUser.join(connection, {
    body: createBody,
  });
  typia.assert(session);
  TestValidator.equals(
    "external_user_id preservation",
    session.external_user_id,
    external_user_id,
  );
  TestValidator.equals("email preservation", session.email, email);
  TestValidator.equals(
    "actor_type must be authenticatedUser",
    session.actor_type,
    "authenticatedUser",
  );
  TestValidator.predicate(
    "audit created_at present",
    typeof session.created_at === "string" && !!session.created_at,
  );
  TestValidator.predicate(
    "audit updated_at present",
    typeof session.updated_at === "string" && !!session.updated_at,
  );
  typia.assert<IAuthorizationToken>(session.token);

  // 2. Error: Duplicate external_user_id
  await TestValidator.error("duplicate external_user_id rejected", async () => {
    await api.functional.auth.authenticatedUser.join(connection, {
      body: {
        external_user_id,
        email: `${RandomGenerator.alphaNumeric(8)}@businessdomain.com`,
        actor_type: "authenticatedUser",
      } satisfies IStoryfieldAiAuthenticatedUser.ICreate,
    });
  });
  // 3. Error: Duplicate email
  await TestValidator.error("duplicate email rejected", async () => {
    await api.functional.auth.authenticatedUser.join(connection, {
      body: {
        external_user_id: RandomGenerator.alphaNumeric(24),
        email,
        actor_type: "authenticatedUser",
      } satisfies IStoryfieldAiAuthenticatedUser.ICreate,
    });
  });
  // 4. Error: Invalid credentials (suspicious/injection strings)
  await TestValidator.error(
    "SQL injection-string external_user_id rejected",
    async () => {
      await api.functional.auth.authenticatedUser.join(connection, {
        body: {
          external_user_id: "'1 OR 1=1;--",
          email: `${RandomGenerator.alphaNumeric(8)}@businessdomain.com`,
          actor_type: "authenticatedUser",
        } satisfies IStoryfieldAiAuthenticatedUser.ICreate,
      });
    },
  );
  await TestValidator.error("malformed/injection email rejected", async () => {
    await api.functional.auth.authenticatedUser.join(connection, {
      body: {
        external_user_id: RandomGenerator.alphaNumeric(24),
        email: "<script>alert('xss')</script>",
        actor_type: "authenticatedUser",
      } satisfies IStoryfieldAiAuthenticatedUser.ICreate,
    });
  });
}
