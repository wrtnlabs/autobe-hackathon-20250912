import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformUserAuthentication } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformUserAuthentication";

/**
 * Validate that an organization admin can only retrieve authentication details
 * for user authentications belonging to their own organization, that credential
 * hashes are never exposed in responses, and that RBAC/org scope is enforced.
 *
 * Steps:
 *
 * 1. Register an organization admin (orgAdmin1) and log in
 * 2. Use the admin's authentication context to lookup own admin
 *    userAuthenticationId via successful login (assumed to be created by
 *    join/login)
 * 3. Retrieve details for that authentication id using API - expect to succeed,
 *    with credential hash not present (never in response)
 * 4. Register a second, separate organization admin (orgAdmin2) in a different
 *    org, log in
 * 5. Attempt to retrieve orgAdmin1 authentication id as orgAdmin2 (should be
 *    forbidden/error)
 * 6. Try to retrieve a random non-existent id (should be forbidden or not found)
 */
export async function test_api_org_user_authentication_detail_and_access_check(
  connection: api.IConnection,
) {
  // 1. Register first org admin and log in
  const email1 = typia.random<string & tags.Format<"email">>();
  const password1 = RandomGenerator.alphaNumeric(10);
  const fullName1 = RandomGenerator.name();
  const join1: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        email: email1,
        full_name: fullName1,
        password: password1,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    });
  typia.assert(join1);
  // 2. The admin's own user authentication id must exist; retrieve by logging in
  const login1: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.login(connection, {
      body: {
        email: email1,
        password: password1,
      } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
    });
  typia.assert(login1);
  // Here, the user's authentication id likely equals their admin id (otherwise, we would need a userAuthenticationId search endpoint, not available)
  // For test purposes, use admin id for user auth id (since both are uuid)
  const validUserAuthId1 = join1.id as string & tags.Format<"uuid">;
  // 3. Retrieve authentication details for own id
  const authDetail: IHealthcarePlatformUserAuthentication =
    await api.functional.healthcarePlatform.organizationAdmin.userAuthentications.at(
      connection,
      { userAuthenticationId: validUserAuthId1 },
    );
  typia.assert(authDetail);
  TestValidator.equals(
    "fetched authentication id matches requested",
    authDetail.id,
    validUserAuthId1,
  );
  TestValidator.predicate(
    "password_hash should not be present in detail response",
    !("password_hash" in authDetail) ||
      authDetail.password_hash === null ||
      authDetail.password_hash === undefined,
  );
  // 4. Register a second admin (assumed different org context)
  const email2 = typia.random<string & tags.Format<"email">>();
  const password2 = RandomGenerator.alphaNumeric(10);
  const fullName2 = RandomGenerator.name();
  const join2: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        email: email2,
        full_name: fullName2,
        password: password2,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    });
  typia.assert(join2);
  // Log in as second admin
  const login2: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.login(connection, {
      body: {
        email: email2,
        password: password2,
      } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
    });
  typia.assert(login2);
  // Try to access org1's authentication record as org2
  await TestValidator.error(
    "should not allow admin2 to access admin1 authentication id",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.userAuthentications.at(
        connection,
        { userAuthenticationId: validUserAuthId1 },
      );
    },
  );
  // 5. Attempt to fetch a random, non-existent id as org2
  await TestValidator.error(
    "should not find authentication by random uuid",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.userAuthentications.at(
        connection,
        { userAuthenticationId: typia.random<string & tags.Format<"uuid">>() },
      );
    },
  );
}
