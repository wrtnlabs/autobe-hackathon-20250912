import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";

export async function test_api_auth_organization_admin_refresh_token_success(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new organization administrator user.
  const adminCreateBody = {
    tenant_id: typia.random<string & tags.Format<"uuid">>(),
    email: `${RandomGenerator.name(1).toLowerCase()}@example.com`,
    password: "StrongPassword123", // Simple but valid password
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;

  const authorized: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(authorized);

  // 2. Extract refresh token from issued tokens.
  const oldRefreshToken: string = authorized.token.refresh;
  TestValidator.predicate(
    "refresh token string must be non-empty",
    typeof oldRefreshToken === "string" && oldRefreshToken.length > 0,
  );

  // 3. Use the refresh token to request new tokens.
  const refreshBody = {
    refresh_token: oldRefreshToken,
  } satisfies IEnterpriseLmsOrganizationAdmin.IRefresh;
  const refreshed: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.refresh(connection, {
      body: refreshBody,
    });
  typia.assert(refreshed);

  // 4. Test that new tokens are issued and differ from old ones.
  TestValidator.predicate(
    "new access token must be a non-empty string",
    typeof refreshed.token.access === "string" &&
      refreshed.token.access.length > 0,
  );
  TestValidator.predicate(
    "new refresh token must be a non-empty string",
    typeof refreshed.token.refresh === "string" &&
      refreshed.token.refresh.length > 0,
  );

  TestValidator.notEquals(
    "access token should be different after refresh",
    refreshed.token.access,
    authorized.token.access,
  );
  TestValidator.notEquals(
    "refresh token should be different after refresh",
    refreshed.token.refresh,
    authorized.token.refresh,
  );
}
