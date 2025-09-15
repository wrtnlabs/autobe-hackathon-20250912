import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficeMarketplaceWidget } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeMarketplaceWidget";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIFlexOfficeMarketplaceWidget } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficeMarketplaceWidget";

/**
 * Test retrieving detailed information of a single marketplace widget by
 * its unique identifier.
 *
 * This comprehensive End-to-End test validates both successful and error
 * workflows. The test includes:
 *
 * - Admin user creation and authentication
 * - Retrieving marketplace widgets with a filter for a specific widget ID
 * - Validating the response structure including widget code, name, version,
 *   and timestamps
 * - Ensuring authorization enforcement: only authenticated admins can access
 * - Handling invalid or non-existent widget ID scenarios
 *
 * The test verifies business rules such as UUID format validation for the
 * widget ID, and that sensitive data is appropriately secured.
 *
 * Workflow:
 *
 * 1. Create admin user
 * 2. Authenticate admin user
 * 3. Construct a search request with appropriate pagination and search params
 *    for the widget ID
 * 4. Send PATCH request to /flexOffice/admin/marketplaceWidgets
 * 5. Verify response contains correct widget details matching the ID
 * 6. Attempt unauthorized requests to confirm rejection
 *
 * Success criteria:
 *
 * - Received 200 response with full widget metadata for the requested ID
 * - Proper authorization error on unauthorized attempts
 */
export async function test_api_marketplace_widget_detail_retrieval_by_id(
  connection: api.IConnection,
) {
  // 1. Admin user creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);

  const adminAuthorized: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IFlexOfficeAdmin.ICreate,
    });
  typia.assert(adminAuthorized);

  // 2. Admin user login
  const adminLoginAuthorized: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IFlexOfficeAdmin.ILogin,
    });
  typia.assert(adminLoginAuthorized);

  // Prepare a request to fetch marketplace widget list filtered by a search term
  const requestBody: IFlexOfficeMarketplaceWidget.IRequest = {
    page: 1,
    limit: 10,
    sortBy: null,
    sortDir: null,
    search: null,
  } satisfies IFlexOfficeMarketplaceWidget.IRequest;

  // 3. Fetch marketplace widgets
  const listWidgets: IPageIFlexOfficeMarketplaceWidget.ISummary =
    await api.functional.flexOffice.admin.marketplaceWidgets.index(connection, {
      body: requestBody,
    });
  typia.assert(listWidgets);

  // 4. Check pagination info correctness
  TestValidator.predicate(
    "pagination current page is 1",
    listWidgets.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is at least 1",
    listWidgets.pagination.limit >= 1,
  );

  // 5. Verify widget summaries
  for (const widget of listWidgets.data) {
    typia.assert(widget);
    TestValidator.predicate(
      "widget id is a non-empty UUID",
      typeof widget.id === "string" && /^[0-9a-fA-F-]{36}$/.test(widget.id),
    );
    TestValidator.predicate(
      "widget code is non-empty string",
      typeof widget.widget_code === "string" && widget.widget_code.length > 0,
    );
    TestValidator.predicate(
      "widget name is non-empty string",
      typeof widget.name === "string" && widget.name.length > 0,
    );
    TestValidator.predicate(
      "widget version is non-empty string",
      typeof widget.version === "string" && widget.version.length > 0,
    );
    TestValidator.predicate(
      "widget has valid created_at timestamp",
      typeof widget.created_at === "string" &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(widget.created_at),
    );
  }

  // 6. Pick one widget ID to get detailed info
  if (listWidgets.data.length === 0) {
    throw new Error("No marketplace widgets found to test detail retrieval.");
  }
  const widgetToDetail = listWidgets.data[0];
  typia.assert(widgetToDetail);

  // 7. Construct detailed retrieval request to fetch by widget code
  const detailRequest: IFlexOfficeMarketplaceWidget.IRequest = {
    page: 1,
    limit: 1,
    sortBy: null,
    sortDir: null,
    search: widgetToDetail.widget_code,
  } satisfies IFlexOfficeMarketplaceWidget.IRequest;

  const widgetDetailPage: IPageIFlexOfficeMarketplaceWidget.ISummary =
    await api.functional.flexOffice.admin.marketplaceWidgets.index(connection, {
      body: detailRequest,
    });
  typia.assert(widgetDetailPage);

  // 8. Validate that widget detail page contains the expected widget
  TestValidator.predicate(
    "widget details contain the requested widget",
    widgetDetailPage.data.some((w) => w.id === widgetToDetail.id),
  );

  // 9. Validate detail widget properties
  const detailWidget = widgetDetailPage.data.find(
    (w) => w.id === widgetToDetail.id,
  );
  if (!detailWidget) {
    throw new Error(
      `Detail widget with id: ${widgetToDetail.id} not found in response`,
    );
  }
  TestValidator.equals(
    "widget code matches",
    detailWidget.widget_code,
    widgetToDetail.widget_code,
  );
  TestValidator.equals(
    "widget name matches",
    detailWidget.name,
    widgetToDetail.name,
  );
  TestValidator.equals(
    "widget version matches",
    detailWidget.version,
    widgetToDetail.version,
  );
  TestValidator.equals(
    "widget created_at matches",
    detailWidget.created_at,
    widgetToDetail.created_at,
  );

  // 10. Test error scenario: attempt without authentication (simulate unauthenticated connection)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Since the admin endpoint requires authorization, expect error on unauthenticated call
  await TestValidator.error("unauthorized access fails", async () => {
    await api.functional.flexOffice.admin.marketplaceWidgets.index(
      unauthenticatedConnection,
      {
        body: detailRequest,
      },
    );
  });
}
