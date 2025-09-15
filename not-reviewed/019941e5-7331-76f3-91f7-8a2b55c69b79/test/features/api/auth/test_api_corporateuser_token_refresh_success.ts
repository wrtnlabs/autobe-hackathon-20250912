import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEasySignCorporateUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEasySignCorporateUser";

/**
 * Test token refresh API for corporate users.
 *
 * This test calls the /auth/corporateUser/refresh endpoint using a newly
 * generated but structurally valid refresh token to simulate the token
 * refresh flow. It verifies that the response matches the
 * IEasySignCorporateUser.IAuthorized DTO, which contains updated JWT tokens
 * and user information.
 *
 * Due to the lack of signup or login API in this test suite, this test uses
 * typia.random to generate a refresh token that satisfies the DTO type.
 *
 * Steps:
 *
 * 1. Generate a valid refresh token payload.
 * 2. Call the refresh API endpoint with this token.
 * 3. Assert the response type and token structure.
 */
export async function test_api_corporateuser_token_refresh_success(
  connection: api.IConnection,
) {
  // Generate a structurally valid refresh token using typia.random
  const refreshRequest = typia.random<IEasySignCorporateUser.IRefresh>();

  // Call the corporate user token refresh API
  const authorized = await api.functional.auth.corporateUser.refresh(
    connection,
    {
      body: refreshRequest,
    },
  );

  // Assert the response matches the expected authorization payload
  typia.assert(authorized);
}
