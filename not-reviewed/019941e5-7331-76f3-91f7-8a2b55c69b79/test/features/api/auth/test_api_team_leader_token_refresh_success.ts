import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEasySignTeamLeader } from "@ORGANIZATION/PROJECT-api/lib/structures/IEasySignTeamLeader";

/**
 * Verifies that a team leader can successfully refresh JWT tokens.
 *
 * The test begins by creating a new team leader account using valid
 * registration data (email, name, null for optional mobile_phone). It
 * asserts that the join operation returns an authorized user object with
 * valid tokens.
 *
 * Next, it calls the refresh endpoint with the refresh token obtained from
 * the join response to obtain a new set of tokens. The response is
 * validated for correct structure and content.
 *
 * Business logic such as token expiration and revocation handling are
 * excluded here as the focus is on the success path.
 *
 * This ensures that the token cycle for team leaders is properly
 * functioning.
 */
export async function test_api_team_leader_token_refresh_success(
  connection: api.IConnection,
) {
  // Register a new team leader
  const teamLeaderEmail = typia.random<string & tags.Format<"email">>();
  const teamLeaderCreateBody = {
    email: teamLeaderEmail,
    name: RandomGenerator.name(),
    mobile_phone: null,
  } satisfies IEasySignTeamLeader.ICreate;

  const authorized = await api.functional.auth.teamLeader.join(connection, {
    body: teamLeaderCreateBody,
  });
  typia.assert(authorized);

  TestValidator.predicate(
    "received access token",
    typeof authorized.token.access === "string" &&
      authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "received refresh token",
    typeof authorized.token.refresh === "string" &&
      authorized.token.refresh.length > 0,
  );

  // Refresh token
  const refreshTokenBody = {
    refreshToken: authorized.token.refresh,
  } satisfies IEasySignTeamLeader.IRefresh;

  const refreshed = await api.functional.auth.teamLeader.refresh(connection, {
    body: refreshTokenBody,
  });
  typia.assert(refreshed);

  TestValidator.predicate(
    "new access token issued",
    typeof refreshed.token.access === "string" &&
      refreshed.token.access.length > 0,
  );
  TestValidator.predicate(
    "new refresh token issued",
    typeof refreshed.token.refresh === "string" &&
      refreshed.token.refresh.length > 0,
  );

  TestValidator.equals("team leader ID unchanged", refreshed.id, authorized.id);
  TestValidator.equals(
    "team leader email unchanged",
    refreshed.email,
    authorized.email,
  );
  TestValidator.equals(
    "team leader name unchanged",
    refreshed.name,
    authorized.name,
  );
  TestValidator.equals(
    "team leader mobile phone unchanged",
    refreshed.mobile_phone ?? null,
    authorized.mobile_phone ?? null,
  );
}
