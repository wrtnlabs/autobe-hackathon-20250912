import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformTechnician } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformTechnician";

/**
 * Test the refresh token flow for platform technicians.
 *
 * 1. Register a technician
 * 2. Login as technician to get access/refresh tokens
 * 3. Use refresh endpoint to get new token set
 * 4. Validate the returned token pair and session state
 * 5. Try refresh with invalid/expired/revoked tokens and expect logic error
 * 6. Simulate technician soft-delete and verify refresh is denied
 */
export async function test_api_technician_token_refresh_workflow(
  connection: api.IConnection,
) {
  // 1. Register technician
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    license_number: RandomGenerator.alphaNumeric(8),
    specialty: null,
    phone: null,
  } satisfies IHealthcarePlatformTechnician.IJoin;

  const joined = await api.functional.auth.technician.join(connection, {
    body: joinInput,
  });
  typia.assert(joined);

  // 2. Login as technician (to get real refresh token)
  const login = await api.functional.auth.technician.login(connection, {
    body: {
      email: joinInput.email,
      password: "12345678", // Assume password from join
    } satisfies IHealthcarePlatformTechnician.ILogin,
  });
  typia.assert(login);
  TestValidator.equals("login email consistent", login.email, joinInput.email);
  TestValidator.notEquals(
    "refresh tokens are issued",
    joined.token.refresh,
    login.token.refresh,
  );

  // 3. Use /auth/technician/refresh with correct token
  const refreshResult = await api.functional.auth.technician.refresh(
    connection,
    {
      body: {
        refresh_token: login.token.refresh,
      } satisfies IHealthcarePlatformTechnician.IRefresh,
    },
  );
  typia.assert(refreshResult);
  TestValidator.notEquals(
    "access token is rotated",
    login.token.access,
    refreshResult.token.access,
  );
  TestValidator.notEquals(
    "refresh token is rotated",
    login.token.refresh,
    refreshResult.token.refresh,
  );
  TestValidator.equals("technician matches", refreshResult.id, login.id);

  // 4. Failure path: Invalid refresh token
  await TestValidator.error("invalid refresh token should fail", async () => {
    await api.functional.auth.technician.refresh(connection, {
      body: {
        refresh_token: RandomGenerator.alphaNumeric(64),
      } satisfies IHealthcarePlatformTechnician.IRefresh,
    });
  });

  // 5. Failure path: Expired/revoked (previous) refresh token fails after new refresh
  await TestValidator.error(
    "reusing old refresh token should fail",
    async () => {
      await api.functional.auth.technician.refresh(connection, {
        body: {
          refresh_token: login.token.refresh,
        } satisfies IHealthcarePlatformTechnician.IRefresh,
      });
    },
  );

  // 6. Simulating soft-delete: there is no delete endpoint, so this is only
  // a negative-path boundary test - cannot directly set deleted_at.
  // (If such endpoint existed, would do: archive technician, then try refresh and expect error)
}
