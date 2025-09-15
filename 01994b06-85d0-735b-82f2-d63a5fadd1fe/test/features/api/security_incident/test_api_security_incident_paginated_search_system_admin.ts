import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformSecurityIncident } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSecurityIncident";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformSecurityIncident } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformSecurityIncident";

/**
 * Validate system administrator paginated security incident search.
 *
 * 1. Register a healthcare platform system admin
 * 2. Log in as system admin
 * 3. Search for security incidents with and without filters (pagination,
 *    match/no-match)
 * 4. Edge cases: empty result, unauthorized access, and business validation error
 */
export async function test_api_security_incident_paginated_search_system_admin(
  connection: api.IConnection,
) {
  // 1. Register system admin
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminJoinBody = {
    email: adminEmail,
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    provider: "local",
    provider_key: adminEmail,
    password: "TestPass123!",
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const admin: IHealthcarePlatformSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Log in as admin (verifies session and token rotation)
  const loginBody = {
    email: adminEmail,
    provider: "local",
    provider_key: adminEmail,
    password: "TestPass123!",
  } satisfies IHealthcarePlatformSystemAdmin.ILogin;
  const login: IHealthcarePlatformSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: loginBody,
    });
  typia.assert(login);

  // 3. Broad search: No filters, just pagination
  const broadRequest = {
    page: 1,
    page_size: 10,
  } satisfies IHealthcarePlatformSecurityIncident.IRequest;
  const broadPage: IPageIHealthcarePlatformSecurityIncident.ISummary =
    await api.functional.healthcarePlatform.systemAdmin.securityIncidents.index(
      connection,
      { body: broadRequest },
    );
  typia.assert(broadPage);
  TestValidator.predicate(
    "pagination info exists",
    broadPage.pagination !== undefined &&
      typeof broadPage.pagination.current === "number",
  );
  TestValidator.predicate(
    "result data is array",
    Array.isArray(broadPage.data),
  );

  if (broadPage.data.length > 0) {
    const firstIncident = broadPage.data[0];
    const filteredRequest = {
      organization_id: firstIncident.organization_id,
      status: firstIncident.status,
      incident_type: firstIncident.incident_type,
      page: 1,
      page_size: 10,
    } satisfies IHealthcarePlatformSecurityIncident.IRequest;
    const filteredPage =
      await api.functional.healthcarePlatform.systemAdmin.securityIncidents.index(
        connection,
        { body: filteredRequest },
      );
    typia.assert(filteredPage);
    TestValidator.predicate(
      "filtered data matches query",
      filteredPage.data.every(
        (x) =>
          x.organization_id === firstIncident.organization_id &&
          x.status === firstIncident.status &&
          x.incident_type === firstIncident.incident_type,
      ),
    );
  }

  // Edge case: Impossible filter (random organization_id)
  const noResultRequest = {
    organization_id: typia.random<string & tags.Format<"uuid">>(),
    page: 1,
    page_size: 5,
  } satisfies IHealthcarePlatformSecurityIncident.IRequest;
  const noResultPage =
    await api.functional.healthcarePlatform.systemAdmin.securityIncidents.index(
      connection,
      { body: noResultRequest },
    );
  typia.assert(noResultPage);
  TestValidator.equals("data empty when no match", noResultPage.data.length, 0);

  // Edge case: Pagination parameter validation error (negative page, 0 size)
  await TestValidator.error(
    "invalid pagination params gives validation error",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.securityIncidents.index(
        connection,
        {
          body: {
            page: -1 as number & tags.Type<"int32">,
            page_size: 0 as number & tags.Type<"int32">,
          } satisfies IHealthcarePlatformSecurityIncident.IRequest,
        },
      );
    },
  );

  // Edge case: Unauthorized - no auth headers
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated request is rejected", async () => {
    await api.functional.healthcarePlatform.systemAdmin.securityIncidents.index(
      unauthConnection,
      { body: broadRequest },
    );
  });
}
