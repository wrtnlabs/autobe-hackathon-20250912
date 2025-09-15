import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentTechReviewer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentTechReviewer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validate technical reviewer login scenarios: success, invalid password,
 * non-existent account, and hint inactive account handling.
 *
 * This test covers:
 *
 * 1. Register a new technical reviewer, then login successfully and verify
 *    returned JWT tokens and profile.
 * 2. Attempt login with invalid password for the same account; expect
 *    authentication error.
 * 3. (Information only) Placeholder for testing login with inactive/deleted
 *    reviewer (not implementable with current APIs).
 * 4. Attempt login with non-existent email; expect authentication failure.
 */
export async function test_api_tech_reviewer_login_success_and_failure(
  connection: api.IConnection,
) {
  // -- Register a new reviewer
  const reviewerEmail = typia.random<string & tags.Format<"email">>();
  const reviewerPassword = RandomGenerator.alphaNumeric(12);
  const reviewerName = RandomGenerator.name();
  const reviewerSpec = RandomGenerator.pick([
    "Backend",
    "Cloud",
    "AI",
    "Web",
  ] as const);

  const joinBody = {
    email: reviewerEmail,
    password: reviewerPassword,
    name: reviewerName,
    specialization: reviewerSpec,
  } satisfies IAtsRecruitmentTechReviewer.ICreate;

  const joinResult = await api.functional.auth.techReviewer.join(connection, {
    body: joinBody,
  });
  typia.assert(joinResult);

  // ---- Scenario 1: successful login ----
  const loginBody = {
    email: reviewerEmail,
    password: reviewerPassword,
  } satisfies IAtsRecruitmentTechReviewer.ILogin;

  const loginResult = await api.functional.auth.techReviewer.login(connection, {
    body: loginBody,
  });
  typia.assert(loginResult);

  // Assert JWT in result
  TestValidator.predicate(
    "login returns JWT access token",
    loginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "login returns JWT refresh token",
    loginResult.token.refresh.length > 0,
  );
  TestValidator.equals(
    "login returns correct email",
    loginResult.email,
    reviewerEmail,
  );
  TestValidator.equals(
    "login returns correct name",
    loginResult.name,
    reviewerName,
  );
  TestValidator.equals(
    "login returns correct specialization",
    loginResult.specialization,
    reviewerSpec,
  );
  TestValidator.predicate(
    "login returns active account",
    loginResult.is_active === true,
  );

  // ---- Scenario 2: invalid password ----
  const invalidPasswordBody = {
    email: reviewerEmail,
    password: reviewerPassword + "wrong", // definitely wrong
  } satisfies IAtsRecruitmentTechReviewer.ILogin;

  await TestValidator.error("login with wrong password must fail", async () => {
    await api.functional.auth.techReviewer.login(connection, {
      body: invalidPasswordBody,
    });
  });

  // ---- Scenario 3: Placeholder for inactive account login ----
  // NOTE: No API provided for deactivation/deletion, so this scenario is referenced only.

  // ---- Scenario 4: login with non-existent email ----
  const nonexistBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
  } satisfies IAtsRecruitmentTechReviewer.ILogin;
  await TestValidator.error(
    "login with non-existent email must fail",
    async () => {
      await api.functional.auth.techReviewer.login(connection, {
        body: nonexistBody,
      });
    },
  );
}
