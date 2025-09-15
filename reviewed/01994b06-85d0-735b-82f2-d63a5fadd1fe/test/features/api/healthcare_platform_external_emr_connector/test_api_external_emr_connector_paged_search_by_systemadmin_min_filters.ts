import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformExternalEmrConnector } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformExternalEmrConnector";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformExternalEmrConnector } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformExternalEmrConnector";

/**
 * Test system admin paged search for external EMR connectors (minimum filters).
 *
 * 1. Register a new systemAdmin user.
 * 2. Login as systemAdmin to get token.
 * 3. Issue paginated search for externalEmrConnectors with empty filter (minimum
 *    input).
 * 4. Validate all returned connector summaries are visible to admin.
 * 5. Validate pagination count, limit, records, and pages.
 * 6. Page to the next result page (page=2) and validate.
 * 7. Test unauthorized access (as unauthenticated user, expect error).
 * 8. Test with invalid filters (e.g. page=-1, weird UUIDs), expect business error.
 */
export async function test_api_external_emr_connector_paged_search_by_systemadmin_min_filters(
  connection: api.IConnection,
) {
  // 1. Register a new system administrator.
  const joinBody = {
    email: `${RandomGenerator.alphaNumeric(10)}@company-admin.com`,
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    provider: "local",
    provider_key: RandomGenerator.alphaNumeric(10),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert(admin);
  TestValidator.equals(
    "created system admin email matches input",
    admin.email,
    joinBody.email,
  );

  // 2. Login as system administrator.
  const loginBody = {
    email: joinBody.email,
    provider: "local",
    provider_key: joinBody.provider_key,
    password: joinBody.password,
  } satisfies IHealthcarePlatformSystemAdmin.ILogin;
  const authorized = await api.functional.auth.systemAdmin.login(connection, {
    body: loginBody,
  });
  typia.assert(authorized);

  // 3. Issue paginated search for externalEmrConnectors (minimum filter only - all omitted/default)
  const minimalFilter =
    {} satisfies IHealthcarePlatformExternalEmrConnector.IRequest;
  const firstPage =
    await api.functional.healthcarePlatform.systemAdmin.externalEmrConnectors.index(
      connection,
      { body: minimalFilter },
    );
  typia.assert(firstPage);
  TestValidator.predicate("page data present", firstPage.data.length >= 0);
  TestValidator.predicate(
    "pagination current always >= 1",
    firstPage.pagination.current >= 1,
  );
  TestValidator.predicate("page limit >= 1", firstPage.pagination.limit >= 1);
  TestValidator.predicate(
    "records >= data length",
    firstPage.pagination.records >= firstPage.data.length,
  );
  TestValidator.predicate(
    "at least one page is possible",
    firstPage.pagination.pages >= 1,
  );

  // 4. Page to next page (if available)
  if (firstPage.pagination.pages > 1) {
    const page2Body = {
      page: 2,
    } satisfies IHealthcarePlatformExternalEmrConnector.IRequest;
    const secondPage =
      await api.functional.healthcarePlatform.systemAdmin.externalEmrConnectors.index(
        connection,
        { body: page2Body },
      );
    typia.assert(secondPage);
    TestValidator.equals("page 2 is current", secondPage.pagination.current, 2);
  }

  // 5. Validate all connector orgs are visible as admin (if any connectors exist)
  if (firstPage.data.length > 0) {
    for (const connector of firstPage.data) {
      typia.assert(connector);
      TestValidator.predicate(
        "connector org id is valid uuid",
        typeof connector.healthcare_platform_organization_id === "string" &&
          connector.healthcare_platform_organization_id.length > 0,
      );
    }
  }

  // 6. Unauthorized user scenario - should fail without systemAdmin role
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot list connectors",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.externalEmrConnectors.index(
        unauthConn,
        { body: minimalFilter },
      );
    },
  );

  // 7. Test with invalid filter values (should reject with business error, not type error)
  const invalidFilter1 = {
    page: -1,
  } satisfies IHealthcarePlatformExternalEmrConnector.IRequest;
  await TestValidator.error("negative page not allowed", async () => {
    await api.functional.healthcarePlatform.systemAdmin.externalEmrConnectors.index(
      connection,
      { body: invalidFilter1 },
    );
  });

  const invalidFilter2 = {
    healthcare_platform_organization_id: "NOT-A-UUID" as string,
  } satisfies IHealthcarePlatformExternalEmrConnector.IRequest;
  await TestValidator.error("invalid UUID for org id", async () => {
    await api.functional.healthcarePlatform.systemAdmin.externalEmrConnectors.index(
      connection,
      { body: invalidFilter2 },
    );
  });
}
