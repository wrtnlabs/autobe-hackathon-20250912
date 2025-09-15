import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IHealthcarePlatformUserCredential } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformUserCredential";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformUserCredential } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformUserCredential";

/**
 * Scenario to verify search/query for user credential records as a system
 * admin.
 *
 * 1. Register system admin and login to obtain JWT.
 * 2. Create at least one user credential tied to this admin.
 * 3. Perform PATCH search by user_id filter, credential_type filter, and
 *    combinations of both; test ranges for archived/created date.
 * 4. Validate only admin's credentials are returned, paginated appropriately, and
 *    any sensitive fields (e.g. credential_hash) are NOT present.
 * 5. Test no results for mismatched filters, and bad requests for malformed
 *    filters.
 * 6. Validate error on unauthorized (simulate logout and try without token), and
 *    error on page request over data limit.
 */
export async function test_api_search_system_admin_user_credentials_with_various_filters(
  connection: api.IConnection,
) {
  // Admin registration
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    provider: "local",
    provider_key: RandomGenerator.alphabets(8),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert(admin);

  // Explicit relogin for session
  const loginBody = {
    email: joinBody.email,
    provider: "local",
    provider_key: joinBody.provider_key,
    password: joinBody.password,
  } satisfies IHealthcarePlatformSystemAdmin.ILogin;
  const relogin = await api.functional.auth.systemAdmin.login(connection, {
    body: loginBody,
  });
  typia.assert(relogin);

  // Create multiple credentials
  const numCreds = 3;
  const created: IHealthcarePlatformUserCredential[] = [];
  for (let i = 0; i < numCreds; ++i) {
    const now = new Date();
    const credBody = {
      user_id: admin.id,
      user_type: "systemadmin",
      credential_type: RandomGenerator.pick([
        "password",
        "sso",
        "certificate",
        "webauthn",
      ] as const),
      credential_hash: RandomGenerator.alphaNumeric(32),
      created_at: now.toISOString(),
      archived_at: new Date(now.getTime() + 3600 * 1000).toISOString(),
    } satisfies IHealthcarePlatformUserCredential.ICreate;
    const cred =
      await api.functional.healthcarePlatform.systemAdmin.userCredentials.create(
        connection,
        { body: credBody },
      );
    typia.assert(cred);
    created.push(cred);
  }

  // Filter: by user_id only
  const respUserId =
    await api.functional.healthcarePlatform.systemAdmin.userCredentials.index(
      connection,
      {
        body: {
          user_id: admin.id,
        } satisfies IHealthcarePlatformUserCredential.IRequest,
      },
    );
  typia.assert(respUserId);
  TestValidator.predicate(
    "all returned records match admin user_id",
    respUserId.data.every((r) => r.user_id === admin.id),
  );

  // Filter: by credential_type (choose one)
  const credTypeSample = created[0].credential_type;
  const respCredType =
    await api.functional.healthcarePlatform.systemAdmin.userCredentials.index(
      connection,
      {
        body: {
          credential_type: credTypeSample,
        } satisfies IHealthcarePlatformUserCredential.IRequest,
      },
    );
  typia.assert(respCredType);
  TestValidator.predicate(
    "all records match credential_type",
    respCredType.data.every((r) => r.credential_type === credTypeSample),
  );

  // Combined filter: user_id + credential_type finds only fitting
  const respBoth =
    await api.functional.healthcarePlatform.systemAdmin.userCredentials.index(
      connection,
      {
        body: {
          user_id: admin.id,
          credential_type: credTypeSample,
        } satisfies IHealthcarePlatformUserCredential.IRequest,
      },
    );
  typia.assert(respBoth);
  TestValidator.predicate(
    "combined filter: user_id+type",
    respBoth.data.every(
      (r) => r.user_id === admin.id && r.credential_type === credTypeSample,
    ),
  );

  // Filter: archived_at date range
  const from = created[0].archived_at;
  const to = created[created.length - 1].archived_at;
  const respRange =
    await api.functional.healthcarePlatform.systemAdmin.userCredentials.index(
      connection,
      {
        body: {
          archived_at_from: from,
          archived_at_to: to,
        } satisfies IHealthcarePlatformUserCredential.IRequest,
      },
    );
  typia.assert(respRange);
  TestValidator.predicate(
    "results within archived_at range",
    respRange.data.every((r) => r.archived_at >= from && r.archived_at <= to),
  );

  // Pagination: page 1, pagesize 2
  const pageResp =
    await api.functional.healthcarePlatform.systemAdmin.userCredentials.index(
      connection,
      {
        body: {
          page: 1 as number,
          pageSize: 2 as number,
        } satisfies IHealthcarePlatformUserCredential.IRequest,
      },
    );
  typia.assert(pageResp);
  TestValidator.equals(
    "max pageSize returned",
    pageResp.data.length <= 2,
    true,
  );

  // Edge: page out of range (e.g. page 100)
  const outPage =
    await api.functional.healthcarePlatform.systemAdmin.userCredentials.index(
      connection,
      {
        body: {
          page: 100 as number,
          pageSize: 2 as number,
        } satisfies IHealthcarePlatformUserCredential.IRequest,
      },
    );
  typia.assert(outPage);
  TestValidator.equals(
    "out-of-range page returns empty",
    outPage.data.length,
    0,
  );

  // Edge: unmatched filters - expect empty result
  const respNone =
    await api.functional.healthcarePlatform.systemAdmin.userCredentials.index(
      connection,
      {
        body: {
          credential_type: "nonexistent",
        } satisfies IHealthcarePlatformUserCredential.IRequest,
      },
    );
  typia.assert(respNone);
  TestValidator.equals(
    "unmatched filter yields no results",
    respNone.data.length,
    0,
  );

  // Security: ensure credential_hash is NOT present
  const secSample =
    await api.functional.healthcarePlatform.systemAdmin.userCredentials.index(
      connection,
      {
        body: {
          user_id: admin.id,
        } satisfies IHealthcarePlatformUserCredential.IRequest,
      },
    );
  typia.assert(secSample);
  TestValidator.predicate(
    "credential_hash should NOT appear in summaries",
    secSample.data.every((r) => !("credential_hash" in r)),
  );

  // Error: unauthorized access
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized credential search blocked",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.userCredentials.index(
        unauthConn,
        {
          body: {
            user_id: admin.id,
          } satisfies IHealthcarePlatformUserCredential.IRequest,
        },
      );
    },
  );
}
