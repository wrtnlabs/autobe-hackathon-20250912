import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficeMarketplaceWidget } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeMarketplaceWidget";
import type { IFlexOfficeWidgetInstallation } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeWidgetInstallation";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIFlexOfficeWidgetInstallation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficeWidgetInstallation";

/**
 * Test for admin paginated retrieval and filtering of marketplace widget
 * installations.
 *
 * This test includes:
 *
 * 1. Registration and authentication of a new admin user.
 * 2. Creation of a new marketplace widget.
 * 3. Paginated retrieval of widget installations with various filter and
 *    sorting parameters.
 * 4. Authorization enforcement by testing unauthorized access denial.
 */
export async function test_api_marketplace_widget_installations_pagination_and_filtering_admin(
  connection: api.IConnection,
) {
  // Step 1. Admin User Registration
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword = "StrongPassword123!";

  const adminCreateBody = {
    email: adminEmail,
    password: adminPassword,
  } satisfies IFlexOfficeAdmin.ICreate;

  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
  } satisfies IFlexOfficeAdmin.ILogin;

  // Step 2. Create Marketplace Widget
  const widgetCreateBody = {
    widget_code: `code_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(3),
    version: "1.0.0",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IFlexOfficeMarketplaceWidget.ICreate;

  // Step 3. Register admin
  const admin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(admin);

  // Step 4. Login admin
  const authedAdmin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(authedAdmin);

  // Step 5. Create marketplace widget
  const createdWidget: IFlexOfficeMarketplaceWidget =
    await api.functional.flexOffice.admin.marketplaceWidgets.create(
      connection,
      {
        body: widgetCreateBody,
      },
    );
  typia.assert(createdWidget);

  // Step 6. Retrieve installations list with various pagination and filtering
  const pageRequests: IFlexOfficeWidgetInstallation.IRequest[] = [
    { page: 0, limit: 10, filterByWidgetId: createdWidget.id },
    {
      page: 1,
      limit: 5,
      search: "installation",
      filterByWidgetId: createdWidget.id,
    },
    {
      page: 2,
      limit: 15,
      sortBy: "created_at",
      sortOrder: "asc",
      filterByWidgetId: createdWidget.id,
    },
    { page: 0, limit: 10, filterByWidgetId: createdWidget.id },
  ];

  for (const body of pageRequests) {
    const installationsPage: IPageIFlexOfficeWidgetInstallation.ISummary =
      await api.functional.flexOffice.admin.marketplaceWidgets.installations.indexWidgetInstallations(
        connection,
        {
          widgetId: createdWidget.id,
          body,
        },
      );
    typia.assert(installationsPage);

    // Validate pagination info plausibility
    TestValidator.predicate(
      "pagination limit must be positive",
      installationsPage.pagination.limit > 0,
    );
    TestValidator.predicate(
      "pagination current page valid",
      installationsPage.pagination.current >= 0,
    );
    TestValidator.predicate(
      "pagination total pages not negative",
      installationsPage.pagination.pages >= 0,
    );
    TestValidator.predicate(
      "pagination records non-negative",
      installationsPage.pagination.records >= 0,
    );

    // When not last page, data length should be at least 1
    const notLastPage =
      installationsPage.pagination.current <
      installationsPage.pagination.pages - 1;
    if (notLastPage) {
      TestValidator.predicate(
        "data length positive when not last page",
        installationsPage.data.length > 0,
      );
    }

    // All installation summaries should match the filtered widgetId
    for (const summary of installationsPage.data) {
      TestValidator.equals(
        "widgetId matches filter",
        summary.marketplace_widget_id,
        createdWidget.id,
      );
    }
  }

  // Step 7. Authorization enforcement: attempt access without authentication
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthorized access denied", async () => {
    await api.functional.flexOffice.admin.marketplaceWidgets.installations.indexWidgetInstallations(
      unauthConnection,
      {
        widgetId: createdWidget.id,
        body: {
          page: 0,
          limit: 10,
        } satisfies IFlexOfficeWidgetInstallation.IRequest,
      },
    );
  });
}
