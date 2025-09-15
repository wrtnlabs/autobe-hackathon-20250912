import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEasySignFreelancerUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEasySignFreelancerUser";

/**
 * This E2E test verifies the freelancer user authentication through POST
 * /auth/freelancerUser/login. It tests successful login with valid
 * credentials and correct token structure, and verifies error handling for
 * invalid passwords and non-existent emails.
 *
 * The test validates core authentication business rules including password
 * verification, JWT token issuance with proper expiration timestamps, and
 * secure error responses. It ensures the secure authentication lifecycle
 * and correct session token management for freelancer users.
 */
export async function test_api_freelancer_user_authentication_and_token_generation(
  connection: api.IConnection,
) {
  // 1. Generate a valid login credential with random but valid email and password
  const validLogin = typia.random<IEasySignFreelancerUser.ILogin>();

  // 2. Perform login
  const authResult: IEasySignFreelancerUser.IAuthorized =
    await api.functional.auth.freelancerUser.login(connection, {
      body: validLogin,
    });
  typia.assert(authResult);

  // Validate user ID format (UUID format with lowercase hex and dashes)
  TestValidator.predicate(
    "user ID is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      authResult.id,
    ),
  );

  // Validate token data
  const token: IAuthorizationToken = authResult.token;
  typia.assert(token);

  // Validate token fields are non-empty strings
  TestValidator.predicate(
    "access token is a non-empty string",
    typeof token.access === "string" && token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is a non-empty string",
    typeof token.refresh === "string" && token.refresh.length > 0,
  );

  // Validate expired_at and refreshable_until are ISO 8601 date-time strings
  TestValidator.predicate(
    "expired_at is ISO 8601 date-time format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(token.expired_at),
  );
  TestValidator.predicate(
    "refreshable_until is ISO 8601 date-time format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(
      token.refreshable_until,
    ),
  );

  // 3. Validate error when logging in with invalid password
  const invalidPasswordLogin = {
    email: validLogin.email,
    password: "WrongPassword!",
  } satisfies IEasySignFreelancerUser.ILogin;

  await TestValidator.error(
    "login with wrong password should fail",
    async () => {
      await api.functional.auth.freelancerUser.login(connection, {
        body: invalidPasswordLogin,
      });
    },
  );

  // 4. Validate error when logging in with a non-existent email
  const nonExistentEmailLogin = {
    email: "nonexistent.user@example.com",
    password: "AnyPassword1",
  } satisfies IEasySignFreelancerUser.ILogin;

  await TestValidator.error(
    "login with non-existent email should fail",
    async () => {
      await api.functional.auth.freelancerUser.login(connection, {
        body: nonExistentEmailLogin,
      });
    },
  );
}
