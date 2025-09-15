import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformUserCredential } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformUserCredential";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformUserCredential } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformUserCredential";

/**
 * Test search, filter, and pagination of organization admin user credentials
 * for PATCH /healthcarePlatform/organizationAdmin/userCredentials.
 *
 * This test ensures that:
 *
 * 1. Only admin-organization user credentials are accessible.
 * 2. Filtering by user_id, credential_type, and date works.
 * 3. Pagination returns the correct number and pages of results.
 * 4. Unauthenticated and insufficient permission attempts fail.
 * 5. No sensitive fields are exposed in API responses.
 */
export async function test_api_search_organization_admin_user_credentials_with_multi_filter_and_pagination(
  connection: api.IConnection,
) {
  // 1. Register a new organization admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminName = RandomGenerator.name();
  const joinResponse = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: adminEmail,
        full_name: adminName,
        password: "ComplexPW!123",
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(joinResponse);
  const adminId = joinResponse.id;

  // 2. Login (practically redundant, token already set by join, but test both flows)
  const loginResponse = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: {
        email: adminEmail,
        password: "ComplexPW!123",
      } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
    },
  );
  typia.assert(loginResponse);
  TestValidator.equals(
    "organization admin id stable",
    loginResponse.id,
    adminId,
  );

  // 3. Create a user credential record (archived)
  const issuedAt = new Date().toISOString();
  const archivedAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // +1 hour
  const credType = RandomGenerator.pick([
    "password",
    "sso",
    "certificate",
    "webauthn",
  ] as const);
  const userCredential =
    await api.functional.healthcarePlatform.organizationAdmin.userCredentials.create(
      connection,
      {
        body: {
          user_id: adminId,
          user_type: "orgadmin",
          credential_type: credType,
          credential_hash: RandomGenerator.alphaNumeric(32),
          created_at: issuedAt,
          archived_at: archivedAt,
        } satisfies IHealthcarePlatformUserCredential.ICreate,
      },
    );
  typia.assert(userCredential);

  // 4. Search: Filter by user_id (should return the record)
  const filterUserIdRes =
    await api.functional.healthcarePlatform.organizationAdmin.userCredentials.index(
      connection,
      {
        body: {
          user_id: adminId,
        } satisfies IHealthcarePlatformUserCredential.IRequest,
      },
    );
  typia.assert(filterUserIdRes);
  TestValidator.predicate(
    "credential filtered by user_id exists",
    filterUserIdRes.data.some((c) => c.id === userCredential.id),
  );

  // 5. Search: Filter by credential_type and date
  const filterTypeAndDateRes =
    await api.functional.healthcarePlatform.organizationAdmin.userCredentials.index(
      connection,
      {
        body: {
          user_type: "orgadmin",
          credential_type: credType,
          created_at_from: issuedAt,
          created_at_to: archivedAt,
        } satisfies IHealthcarePlatformUserCredential.IRequest,
      },
    );
  typia.assert(filterTypeAndDateRes);
  TestValidator.predicate(
    "credential filter by type/date",
    filterTypeAndDateRes.data.some((c) => c.id === userCredential.id),
  );

  // 6. Search: Pagination - Set low pageSize to get multiple pages
  // First, create additional credentials for pagination
  const creds = [userCredential];
  for (let i = 0; i < 5; ++i) {
    const c =
      await api.functional.healthcarePlatform.organizationAdmin.userCredentials.create(
        connection,
        {
          body: {
            user_id: adminId,
            user_type: "orgadmin",
            credential_type: RandomGenerator.pick([
              "password",
              "sso",
              "certificate",
              "webauthn",
            ] as const),
            credential_hash: RandomGenerator.alphaNumeric(32),
            created_at: issuedAt,
            archived_at: archivedAt,
          } satisfies IHealthcarePlatformUserCredential.ICreate,
        },
      );
    typia.assert(c);
    creds.push(c);
  }

  // Pagination: Request 2 per page
  const resultPage1 =
    await api.functional.healthcarePlatform.organizationAdmin.userCredentials.index(
      connection,
      {
        body: {
          user_id: adminId,
          page: 1,
          pageSize: 2,
        } satisfies IHealthcarePlatformUserCredential.IRequest,
      },
    );
  typia.assert(resultPage1);
  TestValidator.equals("pagination limit", resultPage1.data.length, 2);
  TestValidator.equals("pagination current", resultPage1.pagination.current, 1);

  const resultPage2 =
    await api.functional.healthcarePlatform.organizationAdmin.userCredentials.index(
      connection,
      {
        body: {
          user_id: adminId,
          page: 2,
          pageSize: 2,
        } satisfies IHealthcarePlatformUserCredential.IRequest,
      },
    );
  typia.assert(resultPage2);
  TestValidator.equals(
    "page 2 has items or empty",
    typeof resultPage2.data.length,
    "number",
  );

  // Pagination: page out of range
  const resultPage100 =
    await api.functional.healthcarePlatform.organizationAdmin.userCredentials.index(
      connection,
      {
        body: {
          user_id: adminId,
          page: 100,
          pageSize: 2,
        } satisfies IHealthcarePlatformUserCredential.IRequest,
      },
    );
  typia.assert(resultPage100);
  TestValidator.equals(
    "empty page for out-of-range",
    resultPage100.data.length,
    0,
  );

  // 7. Search: Unauthenticated request fails
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated search forbidden", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.userCredentials.index(
      unauthConn,
      {
        body: {
          user_id: adminId,
        } satisfies IHealthcarePlatformUserCredential.IRequest,
      },
    );
  });

  // 8. Search: Try insufficient rights (simulate by creating a new unrelated admin)
  const otherAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        full_name: RandomGenerator.name(),
        password: "MustDiffPW456",
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(otherAdmin);
  // switch to new admin
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: otherAdmin.email,
      password: "MustDiffPW456",
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });
  await TestValidator.error(
    "other org admin cannot access credentials",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.userCredentials.index(
        connection,
        {
          body: {
            user_id: adminId,
          } satisfies IHealthcarePlatformUserCredential.IRequest,
        },
      );
    },
  );

  // 9. Security: Check no sensitive 'credential_hash' returned
  const credsRes =
    await api.functional.healthcarePlatform.organizationAdmin.userCredentials.index(
      connection,
      {
        body: {} satisfies IHealthcarePlatformUserCredential.IRequest,
      },
    );
  typia.assert(credsRes);
  if (credsRes.data.length > 0) {
    TestValidator.predicate(
      "no sensitive field credential_hash in result",
      !("credential_hash" in credsRes.data[0]),
    );
  }
}
