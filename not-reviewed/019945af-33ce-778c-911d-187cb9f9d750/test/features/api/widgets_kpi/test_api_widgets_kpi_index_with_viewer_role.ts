import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeViewer } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeViewer";
import type { IFlexOfficeWidgetKpi } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeWidgetKpi";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIFlexOfficeWidgetKpi } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficeWidgetKpi";

/**
 * This test validates the viewer role authorization flow for retrieving KPI
 * widgets list with various filters, pagination, and sorting options through
 * the PATCH /flexOffice/viewer/widgets/kpi API endpoint.
 *
 * The workflow follows:
 *
 * 1. Create and authenticate a viewer user via join.
 * 2. Perform login with the viewer user's credentials.
 * 3. Send KPI widget list requests with pagination and sorting parameters.
 * 4. Validate response correctness, data integrity, and sorting order in both
 *    descending and ascending order scenarios.
 * 5. Validate pagination behavior and absence of overlapping records between
 *    pages.
 *
 * Comprehensive schema validation is done with typia.assert, and detailed
 * predicate and equality checks ensure business logic accuracy and security
 * considerations for the viewer role.
 */
export async function test_api_widgets_kpi_index_with_viewer_role(
  connection: api.IConnection,
) {
  // 1. Viewer user creation and authentication
  const viewerName = RandomGenerator.name();
  const viewerEmail = `viewer_${RandomGenerator.alphaNumeric(5)}@example.com`;
  const viewerPassword = "securePassword123";

  const createRequestBody = {
    name: viewerName,
    email: viewerEmail,
    password: viewerPassword,
  } satisfies IFlexOfficeViewer.ICreate;

  // Join viewer
  const viewerAuthorized: IFlexOfficeViewer.IAuthorized =
    await api.functional.auth.viewer.join(connection, {
      body: createRequestBody,
    });
  typia.assert(viewerAuthorized);

  // 2. Viewer login to refresh authentication token
  const loginRequestBody = {
    email: viewerEmail,
    password: viewerPassword,
  } satisfies IFlexOfficeViewer.ILogin;
  const viewerLoggedIn: IFlexOfficeViewer.IAuthorized =
    await api.functional.auth.viewer.login(connection, {
      body: loginRequestBody,
    });
  typia.assert(viewerLoggedIn);

  // 3. Compose KPI widget request body (desc order with search term)
  const kpiRequestBody1 = {
    search: RandomGenerator.paragraph({ sentences: 2 }),
    page: 1,
    limit: 10,
    orderBy: "created_at",
    orderDirection: "desc",
  } satisfies IFlexOfficeWidgetKpi.IRequest;

  // 4. Call KPI list endpoint with filtering, sorting
  const page1: IPageIFlexOfficeWidgetKpi.ISummary =
    await api.functional.flexOffice.viewer.widgets.kpi.index(connection, {
      body: kpiRequestBody1,
    });
  typia.assert(page1);

  // 5. Validate pagination info
  TestValidator.predicate("page number is 1", page1.pagination.current === 1);
  TestValidator.predicate("limit is 10", page1.pagination.limit === 10);
  TestValidator.predicate(
    "records count is non-negative",
    page1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is positive or zero",
    page1.pagination.pages >= 0,
  );
  TestValidator.equals(
    "data length is not greater than limit",
    page1.data.length <= page1.pagination.limit,
    true,
  );

  // 6. If records exist, check order of items descending by created_at
  if (page1.data.length >= 2) {
    for (let i = 1; i < page1.data.length; i++) {
      TestValidator.predicate(
        `created_at item ${i - 1} >= item ${i}`,
        page1.data[i - 1].created_at >= page1.data[i].created_at,
      );
    }
  }

  // 7. Make another request with page 2 to test pagination if possible
  if (page1.pagination.pages >= 2) {
    const kpiRequestBody2 = {
      ...kpiRequestBody1,
      page: 2,
    } satisfies IFlexOfficeWidgetKpi.IRequest;

    const page2: IPageIFlexOfficeWidgetKpi.ISummary =
      await api.functional.flexOffice.viewer.widgets.kpi.index(connection, {
        body: kpiRequestBody2,
      });
    typia.assert(page2);

    TestValidator.predicate("page number is 2", page2.pagination.current === 2);
    TestValidator.predicate("limit is 10", page2.pagination.limit === 10);
    TestValidator.equals(
      "data length is not greater than limit",
      page2.data.length <= page2.pagination.limit,
      true,
    );

    // If 2nd page data exists, test order descending
    if (page2.data.length >= 2) {
      for (let i = 1; i < page2.data.length; i++) {
        TestValidator.predicate(
          `created_at item ${i - 1} >= item ${i} (page 2)`,
          page2.data[i - 1].created_at >= page2.data[i].created_at,
        );
      }
    }

    // Ensure no overlap in IDs between page 1 and page 2
    const idsPage1 = page1.data.map((x) => x.id);
    const overlap = page2.data.some((x) => idsPage1.includes(x.id));
    TestValidator.predicate(
      "no IDs overlap between page 1 and page 2",
      !overlap,
    );
  }

  // 8. Repeat with no filtering and ascending order
  const kpiRequestBodyAsc = {
    search: null,
    page: 1,
    limit: 10,
    orderBy: "created_at",
    orderDirection: "asc",
  } satisfies IFlexOfficeWidgetKpi.IRequest;

  const pageAsc: IPageIFlexOfficeWidgetKpi.ISummary =
    await api.functional.flexOffice.viewer.widgets.kpi.index(connection, {
      body: kpiRequestBodyAsc,
    });
  typia.assert(pageAsc);

  TestValidator.predicate("page number is 1", pageAsc.pagination.current === 1);
  TestValidator.predicate("limit is 10", pageAsc.pagination.limit === 10);

  // If data exists, check ascending order
  if (pageAsc.data.length >= 2) {
    for (let i = 1; i < pageAsc.data.length; i++) {
      TestValidator.predicate(
        `created_at item ${i - 1} <= item ${i} (asc)`,
        pageAsc.data[i - 1].created_at <= pageAsc.data[i].created_at,
      );
    }
  }
}
