import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Validate onboarding a new organization admin and email uniqueness
 * constraint.
 *
 * 1. Attempt to join with fresh random email, full_name, (all required fields)
 *    for onboarding a new admin: should succeed, response must contain
 *    authorized admin object and JWT token.
 * 2. Attempt to join again with the exact same email (and full_name/phone) to
 *    test unique email constraint: should fail.
 * 3. Attempt to join using SSO/federated logic (provider and provider_key set,
 *    password omitted/null): should succeed if email is unique; repeat with
 *    same email to test duplicate (should fail).
 * 4. No separate organization concept in DTO, so cannot test "same email for
 *    different organization".
 * 5. MFA/SOO logic is indirectly verified based on presence of
 *    provider/provider_key, or null password; true audit log verification
 *    is not possible from E2E perspective without API.
 */
export async function test_api_org_admin_join_valid_and_duplicate(
  connection: api.IConnection,
) {
  // 1. Valid onboarding
  const uniqueEmail = typia.random<string & tags.Format<"email">>();
  const joinBody = {
    email: uniqueEmail,
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const result = await api.functional.auth.organizationAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert(result);
  TestValidator.equals("registered email returned", result.email, uniqueEmail);
  typia.assert(result.token);
  TestValidator.predicate(
    "has JWT token",
    typeof result.token.access === "string" && result.token.access.length > 0,
  );

  // 2. Attempt duplicate email with same payload (should get error)
  await TestValidator.error(
    "duplicate organization admin email should fail",
    async () => {
      await api.functional.auth.organizationAdmin.join(connection, {
        body: joinBody,
      });
    },
  );

  // 3. Attempt federated/SSO join flow: provider/provider_key set, password unset/null
  const ssoEmail = typia.random<string & tags.Format<"email">>();
  const ssoJoinBody = {
    email: ssoEmail,
    full_name: RandomGenerator.name(),
    provider: "saml", // plausible SSO provider
    provider_key: RandomGenerator.alphaNumeric(16),
    password: null,
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const ssoResult = await api.functional.auth.organizationAdmin.join(
    connection,
    { body: ssoJoinBody },
  );
  typia.assert(ssoResult);
  TestValidator.equals(
    "registered sso email returned",
    ssoResult.email,
    ssoEmail,
  );
  typia.assert(ssoResult.token);
  TestValidator.predicate(
    "has JWT token (sso)",
    typeof ssoResult.token.access === "string" &&
      ssoResult.token.access.length > 0,
  );

  // 3.2. Try duplicate SSO join again with same email/provider/provider_key (should fail)
  await TestValidator.error(
    "duplicate organization admin sso join should fail",
    async () => {
      await api.functional.auth.organizationAdmin.join(connection, {
        body: ssoJoinBody,
      });
    },
  );
}
