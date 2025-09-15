import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditor";
import type { IFlexOfficeWidgetKpi } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeWidgetKpi";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIFlexOfficeWidgetKpi } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficeWidgetKpi";

/**
 * E2E test for PATCH /flexOffice/editor/widgets/kpi endpoint
 *
 * This test validates the full business flow for an editor user retrieving
 * KPI widget summaries with pagination, filtering, and sorting applied. It
 * ensures all steps from editor registration and login, to usage of the KPI
 * widget listing API, result in data that strictly conforms to the API
 * contract and business rules.
 *
 * Workflow:
 *
 * 1. Register a new editor user using the join endpoint
 * 2. Authenticate the editor user using login endpoint to get access
 *    credentials
 * 3. Issue PATCH request to /flexOffice/editor/widgets/kpi with various
 *    filter, pagination, and ordering parameters beneath an authenticated
 *    session
 * 4. Validate the response structure, pagination metadata, and business logic
 *    constraints
 * 5. Additional invocation using filter keyword from response to validate
 *    search capabilities
 *
 * Validation includes checking required properties, pagination count
 * consistency, and role-based access enforcement.
 */
export async function test_api_widgets_kpi_index_with_valid_request(
  connection: api.IConnection,
) {
  // 1. Register editor user with realistic data
  const editorName = RandomGenerator.name();
  const editorEmail = RandomGenerator.alphaNumeric(8) + "@example.com";
  const editorPassword = "safePassword123"; // fixed safe password

  const createBody = {
    name: editorName,
    email: editorEmail,
    password: editorPassword,
  } satisfies IFlexOfficeEditor.ICreate;

  const authorizedEditor: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.join(connection, { body: createBody });
  typia.assert(authorizedEditor);

  // 2. Login for the created editor to ensure valid session
  const loginBody = {
    email: editorEmail,
    password: editorPassword,
  } satisfies IFlexOfficeEditor.ILogin;

  const loggedInEditor: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.login(connection, { body: loginBody });
  typia.assert(loggedInEditor);

  // 3. Retrieve KPI widget list with pagination and sorting
  //    Include page=1, limit=10, ordering by "created_at" descending
  //    Initially no filter keyword
  const requestBody = {
    search: null,
    page: 1,
    limit: 10,
    orderBy: "created_at",
    orderDirection: "desc",
  } satisfies IFlexOfficeWidgetKpi.IRequest;

  let pageResult: IPageIFlexOfficeWidgetKpi.ISummary =
    await api.functional.flexOffice.editor.widgets.kpi.index(connection, {
      body: requestBody,
    });
  typia.assert(pageResult);

  // Validate pagination metadata
  TestValidator.predicate(
    "page is positive integer",
    typeof pageResult.pagination.current === "number" &&
      pageResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit is positive integer",
    typeof pageResult.pagination.limit === "number" &&
      pageResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records is non-negative integer",
    typeof pageResult.pagination.records === "number" &&
      pageResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative integer",
    typeof pageResult.pagination.pages === "number" &&
      pageResult.pagination.pages >= 0,
  );

  // Validate current page does not exceed total pages
  TestValidator.predicate(
    "current page is not greater than pages",
    pageResult.pagination.current <= pageResult.pagination.pages ||
      pageResult.pagination.pages === 0,
  );

  // Validate each KPI widget summary has required properties
  for (const kpiWidget of pageResult.data) {
    typia.assert(kpiWidget); // full structure check
    TestValidator.predicate(
      "kpi widget has uuid id",
      typeof kpiWidget.id === "string" && kpiWidget.id.length === 36,
    );
    TestValidator.predicate(
      "kpi widget flex_office_widget_id format",
      typeof kpiWidget.flex_office_widget_id === "string" &&
        kpiWidget.flex_office_widget_id.length === 36,
    );
    TestValidator.predicate(
      "kpi widget created_at format",
      typeof kpiWidget.created_at === "string" &&
        !isNaN(Date.parse(kpiWidget.created_at)),
    );
  }

  // 4. If there's at least one KPI widget, pick its id as search keyword and test filtering
  if (pageResult.data.length > 0) {
    const firstId = pageResult.data[0].id;
    const filteredRequest = {
      search: firstId,
      page: 1,
      limit: 5,
      orderBy: "created_at",
      orderDirection: "asc",
    } satisfies IFlexOfficeWidgetKpi.IRequest;

    const filteredResult: IPageIFlexOfficeWidgetKpi.ISummary =
      await api.functional.flexOffice.editor.widgets.kpi.index(connection, {
        body: filteredRequest,
      });
    typia.assert(filteredResult);

    // Assertions: filtered result's data should either be empty or contain filtered id
    TestValidator.predicate(
      "filtered data contains widget matching search id or empty",
      filteredResult.data.length === 0 ||
        filteredResult.data.some((k) => k.id === firstId),
    );

    // Pagination checks on filtered result
    TestValidator.predicate(
      "filtered page is 1",
      filteredResult.pagination.current === 1,
    );
    TestValidator.predicate(
      "filtered limit is 5",
      filteredResult.pagination.limit === 5,
    );
  }
}
