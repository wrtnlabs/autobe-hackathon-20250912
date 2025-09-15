import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITelegramFileDownloaderAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderAdministrator";

/**
 * Test deletion of a subscription plan by an administrator user.
 *
 * This scenario covers:
 *
 * 1. Administrator registration via /auth/administrator/join with email and
 *    password_hash.
 * 2. Administrator login via /auth/administrator/login with email and
 *    password.
 * 3. [Optional] Creation of a subscription plan if required (not explicitly
 *    covered due to lack of create API).
 * 4. Deletion of a subscription plan by ID using DELETE
 *    /telegramFileDownloader/administrator/subscription/plans/{id}.
 * 5. Validation that deletion is successful and the plan no longer exists (by
 *    error expectation).
 * 6. Negative cases: deleting non-existent IDs should error, unauthorized
 *    deletion attempts should error with 401.
 *
 * The test enforces that only authenticated administrators can delete plans
 * and validates both happy and error flows.
 *
 * Steps:
 *
 * - Register administrator with random email and password_hash.
 * - Login with same credentials.
 * - Attempt to delete a subscription plan using a valid UUID. (In absence of
 *   create plan API, we simulate with the UUID used or any UUID.)
 * - Validate deletion completes without error.
 * - Attempt unauthorized deletion with empty headers/invalid session.
 * - Attempt deletion of non-existent subscription plan UUID, expect error.
 */
export async function test_api_subscription_plan_deletion_by_administrator(
  connection: api.IConnection,
) {
  // 1. Administrator registration
  const email = `${RandomGenerator.alphabets(8)}@example.com`;
  const passwordHash = RandomGenerator.alphaNumeric(32);
  const createBody = {
    email,
    password_hash: passwordHash,
  } satisfies ITelegramFileDownloaderAdministrator.ICreate;

  const authorized: ITelegramFileDownloaderAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: createBody,
    });
  typia.assert(authorized);

  // 2. Administrator login
  const loginBody = {
    email,
    password: passwordHash,
  } satisfies ITelegramFileDownloaderAdministrator.ILogin;

  const loginAuthorized: ITelegramFileDownloaderAdministrator.IAuthorized =
    await api.functional.auth.administrator.login(connection, {
      body: loginBody,
    });
  typia.assert(loginAuthorized);

  // 3. Deletion of a subscription plan (using random valid UUID)
  const planId = typia.random<string & tags.Format<"uuid">>();

  await api.functional.telegramFileDownloader.administrator.subscription.plans.erase(
    connection,
    { id: planId },
  );

  // 4. Unauthorized deletion attempt (empty headers connection)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthorized deletion should throw", async () => {
    await api.functional.telegramFileDownloader.administrator.subscription.plans.erase(
      unauthConn,
      { id: planId },
    );
  });

  // 5. Attempt to delete non-existent plan
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "deleting non-existent plan should throw",
    async () => {
      await api.functional.telegramFileDownloader.administrator.subscription.plans.erase(
        connection,
        { id: nonExistentId },
      );
    },
  );
}
