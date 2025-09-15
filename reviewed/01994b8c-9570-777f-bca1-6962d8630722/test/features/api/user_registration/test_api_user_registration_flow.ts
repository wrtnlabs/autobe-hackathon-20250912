import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ISubscriptionRenewalGuardianUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ISubscriptionRenewalGuardianUser";

export async function test_api_user_registration_flow(
  connection: api.IConnection,
) {
  // 1. Generate valid user registration data
  const createUserData = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(64),
  } satisfies ISubscriptionRenewalGuardianUser.ICreate;

  // 2. Perform user join operation
  const authorizedUser = await api.functional.auth.user.join(connection, {
    body: createUserData,
  });
  typia.assert(authorizedUser);

  // 3. Validate that returned user data matches expected properties
  TestValidator.predicate(
    "valid user id uuid",
    typeof authorizedUser.id === "string" &&
      /^[0-9a-fA-F\-]{36}$/.test(authorizedUser.id),
  );
  TestValidator.equals(
    "returned email equals input email",
    authorizedUser.email,
    createUserData.email,
  );
  TestValidator.equals(
    "returned password hash equals input",
    authorizedUser.password_hash,
    createUserData.password_hash,
  );

  // 4. Verify the token structure and fields
  const token = authorizedUser.token;
  typia.assert<IAuthorizationToken>(token);
  TestValidator.predicate(
    "access token non-empty string",
    typeof token.access === "string" && token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token non-empty string",
    typeof token.refresh === "string" && token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expiry timestamp format",
    typeof token.expired_at === "string" &&
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/.test(token.expired_at),
  );
  TestValidator.predicate(
    "refreshable_until timestamp format",
    typeof token.refreshable_until === "string" &&
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/.test(
        token.refreshable_until,
      ),
  );

  // 5. Test duplicate email registration triggers error
  await TestValidator.error("duplicate email registration fails", async () => {
    await api.functional.auth.user.join(connection, {
      body: {
        email: createUserData.email,
        password_hash: RandomGenerator.alphaNumeric(64),
      } satisfies ISubscriptionRenewalGuardianUser.ICreate,
    });
  });

  // 6. Test missing email triggers error
  await TestValidator.error("missing email fails", async () => {
    // Using empty string to simulate missing required string field
    await api.functional.auth.user.join(connection, {
      body: {
        email: "",
        password_hash: RandomGenerator.alphaNumeric(64),
      } satisfies ISubscriptionRenewalGuardianUser.ICreate,
    });
  });

  // 7. Test missing password_hash triggers error
  await TestValidator.error("missing password_hash fails", async () => {
    // Using empty string to simulate missing required string field
    await api.functional.auth.user.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password_hash: "",
      } satisfies ISubscriptionRenewalGuardianUser.ICreate,
    });
  });
}
