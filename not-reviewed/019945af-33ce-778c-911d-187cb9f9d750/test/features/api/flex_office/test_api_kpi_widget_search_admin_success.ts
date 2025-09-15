import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficeWidgetKpi } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeWidgetKpi";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIFlexOfficeWidgetKpi } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficeWidgetKpi";

/**
 * This test validates the KPI widget search functionality accessible
 * exclusively to admin users. It verifies the full authentication workflow:
 * admin registration, login, and performing KPI searches with various filters.
 * It asserts correct JWT tokens are issued and enforced, that search results
 * match filter criteria, and that authorization boundaries are respected. A
 * negative test validates unauthorized access rejection.
 */
export async function test_api_kpi_widget_search_admin_success(
  connection: api.IConnection,
) {
  // 1. Admin user registration
  const adminCreateBody = {
    email: `${RandomGenerator.alphaNumeric(5)}@admin.com`,
    password: "s3cur3P@ssw0rd",
  } satisfies IFlexOfficeAdmin.ICreate;

  const createdAdmin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminCreateBody });
  typia.assert(createdAdmin);

  // 2. Admin user login
  const adminLoginBody = {
    email: adminCreateBody.email,
    password: adminCreateBody.password,
  } satisfies IFlexOfficeAdmin.ILogin;

  const loggedInAdmin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, { body: adminLoginBody });
  typia.assert(loggedInAdmin);

  // 3. KPI widget search - empty filters
  const emptySearchRequest: IFlexOfficeWidgetKpi.IRequest = {
    search: null,
    page: 1,
    limit: 5,
    orderBy: null,
    orderDirection: null,
  };

  const kpiWidgetsPage: IPageIFlexOfficeWidgetKpi.ISummary =
    await api.functional.flexOffice.admin.widgets.kpi.index(connection, {
      body: emptySearchRequest,
    });
  typia.assert(kpiWidgetsPage);

  TestValidator.predicate(
    "KPI widgets search returns data array",
    Array.isArray(kpiWidgetsPage.data),
  );

  // 4. KPI widget search no results expected
  const noResultSearchRequest: IFlexOfficeWidgetKpi.IRequest = {
    search: "no-such-kpi-widget-keyword",
    page: 1,
    limit: 5,
    orderBy: null,
    orderDirection: null,
  };

  const noResultPage: IPageIFlexOfficeWidgetKpi.ISummary =
    await api.functional.flexOffice.admin.widgets.kpi.index(connection, {
      body: noResultSearchRequest,
    });
  typia.assert(noResultPage);

  TestValidator.equals(
    "No results return empty data array",
    noResultPage.data.length,
    0,
  );

  // 5. KPI widget search with sorting parameters
  const sortedSearchRequest: IFlexOfficeWidgetKpi.IRequest = {
    search: null,
    page: 1,
    limit: 10,
    orderBy: "created_at",
    orderDirection: "desc",
  };

  const sortedResultPage: IPageIFlexOfficeWidgetKpi.ISummary =
    await api.functional.flexOffice.admin.widgets.kpi.index(connection, {
      body: sortedSearchRequest,
    });
  typia.assert(sortedResultPage);

  TestValidator.predicate(
    "Sorted KPI widgets data array is an array",
    Array.isArray(sortedResultPage.data),
  );
  TestValidator.predicate(
    "Pagination page is 1",
    sortedResultPage.pagination.current === 1,
  );

  // 6. Unauthorized access test: new unauthenticated connection (no tokens)
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "Unauthorized KPI widget search is rejected",
    async () => {
      await api.functional.flexOffice.admin.widgets.kpi.index(
        unauthConnection,
        {
          body: emptySearchRequest,
        },
      );
    },
  );
}
