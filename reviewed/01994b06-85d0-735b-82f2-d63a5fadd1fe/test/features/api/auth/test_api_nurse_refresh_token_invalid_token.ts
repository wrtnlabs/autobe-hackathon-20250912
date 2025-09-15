import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformNurse } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNurse";

/**
 * Validate that the nurse refresh endpoint does NOT accept invalid refresh
 * tokens and returns an error without issuing new tokens.
 *
 * This test ensures that the nurse refresh session API rejects requests with
 * invalid or malicious refresh tokens, protecting security and session
 * correctness. It covers the following workflow:
 *
 * 1. Register a nurse with test data.
 * 2. Log in as that nurse to verify the login flow and establish a session.
 * 3. Attempt to refresh the nurse session with a deliberately invalid or
 *    non-existent refresh token.
 * 4. Check that an error is thrown, confirming the server does not grant a new
 *    authorized session or tokens for invalid requests.
 */
export async function test_api_nurse_refresh_token_invalid_token(
  connection: api.IConnection,
) {
  // 1. Register a nurse
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    license_number: RandomGenerator.alphaNumeric(10),
    specialty: RandomGenerator.pick([
      "ICU",
      "Surgery",
      "Emergency",
      "Med/Surg",
      "Pediatrics",
    ]),
    phone: RandomGenerator.mobile(),
    password: "StrongPassword!23",
  } satisfies IHealthcarePlatformNurse.IJoin;
  const nurse = await api.functional.auth.nurse.join(connection, {
    body: joinBody,
  });
  typia.assert(nurse);

  // 2. Log in as nurse
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
  } satisfies IHealthcarePlatformNurse.ILogin;
  const session = await api.functional.auth.nurse.login(connection, {
    body: loginBody,
  });
  typia.assert(session);

  // 3. Attempt to refresh with an intentionally invalid token
  const invalidRefreshToken = RandomGenerator.alphaNumeric(80); // Deliberately bogus token
  await TestValidator.error(
    "invalid nurse refresh token should fail",
    async () => {
      await api.functional.auth.nurse.refresh(connection, {
        body: {
          refresh_token: invalidRefreshToken,
        } satisfies IHealthcarePlatformNurse.IRefresh,
      });
    },
  );
}
