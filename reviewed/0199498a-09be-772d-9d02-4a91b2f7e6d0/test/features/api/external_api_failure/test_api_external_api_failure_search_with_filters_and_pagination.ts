import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIStoryfieldAiExternalApiFailure } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIStoryfieldAiExternalApiFailure";
import type { IStoryfieldAiExternalApiFailure } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiExternalApiFailure";
import type { IStoryfieldAiSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiSystemAdmin";

/**
 * E2E test for /storyfieldAi/systemAdmin/externalApiFailures search,
 * filter, pagination, and access control.
 *
 * This test validates that a system administrator can:
 *
 * 1. Register and login for privileged operations
 * 2. Search and filter external API failure records using various criteria
 *    (api_type, error_code, date range, user/story refs)
 * 3. Handle over-broad or invalid filters gracefully (receives no/empty
 *    results as expected)
 * 4. Enforce and verify pagination limits and page counts
 * 5. Ensure unauthorized (non-systemAdmin) users are denied access to this
 *    endpoint
 * 6. All assertions use strict type-safety and business logic validation.
 */
export async function test_api_external_api_failure_search_with_filters_and_pagination(
  connection: api.IConnection,
) {
  // 1. Register a new system admin and login
  const externalAdminId: string = RandomGenerator.alphaNumeric(12);
  const adminEmail: string = `${RandomGenerator.name(1)}_${RandomGenerator.alphaNumeric(6)}@company.com`;
  const joinBody = {
    external_admin_id: externalAdminId,
    email: adminEmail,
    actor_type: "systemAdmin",
  } satisfies IStoryfieldAiSystemAdmin.IJoin;
  const adminAuth = await api.functional.auth.systemAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert(adminAuth);

  // Login (to ensure token/session is present)
  const loginBody = {
    external_admin_id: externalAdminId,
    email: adminEmail,
  } satisfies IStoryfieldAiSystemAdmin.ILogin;
  const loginAuth = await api.functional.auth.systemAdmin.login(connection, {
    body: loginBody,
  });
  typia.assert(loginAuth);
  TestValidator.equals(
    "admin email is correct after login",
    loginAuth.email,
    adminAuth.email,
  );

  // 2. Normal search for all failures (no filters, default pagination)
  const allFailures =
    await api.functional.storyfieldAi.systemAdmin.externalApiFailures.index(
      connection,
      { body: {} satisfies IStoryfieldAiExternalApiFailure.IRequest },
    );
  typia.assert(allFailures);
  TestValidator.predicate(
    "external API failures is array (data present or empty)",
    Array.isArray(allFailures.data),
  );

  // If there is data, pick a sample failure to use for filtered searches
  let sampleFailure = undefined;
  if (allFailures.data.length > 0) {
    sampleFailure = RandomGenerator.pick(allFailures.data);

    // 3. Filter by api_type, error_code, and date range
    const filterBody = {
      api_type: sampleFailure.api_type,
      error_code: sampleFailure.error_code,
      created_from: sampleFailure.created_at,
      created_to: sampleFailure.created_at,
      page: 0,
      limit: 5,
    } satisfies IStoryfieldAiExternalApiFailure.IRequest;
    const filteredFailures =
      await api.functional.storyfieldAi.systemAdmin.externalApiFailures.index(
        connection,
        { body: filterBody },
      );
    typia.assert(filteredFailures);
    for (const result of filteredFailures.data) {
      TestValidator.equals(
        "filter matches api_type",
        result.api_type,
        filterBody.api_type,
      );
      TestValidator.equals(
        "filter matches error_code",
        result.error_code,
        filterBody.error_code,
      );
      TestValidator.predicate(
        "created_at within filter",
        result.created_at >= filterBody.created_from! &&
          result.created_at <= filterBody.created_to!,
      );
    }
  }

  // 4. Filter where result is expected to be empty (nonsense error_code)
  const impossibleFilter = {
    error_code: "___NONEXISTENT___",
    page: 0,
    limit: 3,
  } satisfies IStoryfieldAiExternalApiFailure.IRequest;
  const emptyResult =
    await api.functional.storyfieldAi.systemAdmin.externalApiFailures.index(
      connection,
      { body: impossibleFilter },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty data for nonsensical error_code",
    emptyResult.data.length,
    0,
  );

  // 5. Pagination boundary: large limit (should be capped), out-of-bounds page
  const pagedResult =
    await api.functional.storyfieldAi.systemAdmin.externalApiFailures.index(
      connection,
      {
        body: {
          page: 10000,
          limit: 100,
        } satisfies IStoryfieldAiExternalApiFailure.IRequest,
      },
    );
  typia.assert(pagedResult);
  TestValidator.predicate(
    "page does not exceed total possible pages",
    pagedResult.pagination.current <= pagedResult.pagination.pages,
  );
  TestValidator.predicate(
    "limit does not exceed allowed maximum",
    pagedResult.pagination.limit <= 100,
  );

  // 6. REQUIRED field validation (body param must exist)
  // Skipped: TypeScript prohibits omitting required parameters; scenario not possible in valid code

  // 7. Unauthorized access (no admin token)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "endpoint denies access to unauthenticated call",
    async () => {
      await api.functional.storyfieldAi.systemAdmin.externalApiFailures.index(
        unauthConn,
        { body: {} satisfies IStoryfieldAiExternalApiFailure.IRequest },
      );
    },
  );
}
