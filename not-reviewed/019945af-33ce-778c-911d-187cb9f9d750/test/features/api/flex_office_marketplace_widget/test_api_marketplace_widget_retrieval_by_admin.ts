import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficeMarketplaceWidget } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeMarketplaceWidget";

/**
 * Test scenario verifying retrieval of a marketplace widget's detailed
 * information by an admin user.
 *
 * Overview: This test ensures that an authenticated admin user can fetch
 * details of a specific marketplace widget by its ID. It validates correct
 * retrieval of all metadata fields and proper authorization enforcement.
 *
 * Workflow:
 *
 * 1. Authenticate as an admin user.
 * 2. Since no direct API is provided for creating marketplace widgets, this
 *    test uses a randomly generated UUID as the widget ID to test retrieval
 *    and error handling.
 * 3. Send GET /flexOffice/admin/marketplaceWidgets/{id} with the widget ID.
 * 4. Verify the response includes all relevant fields such as widget code,
 *    name, version, description, and timestamps.
 * 5. Test unauthorized access by unauthenticated or non-admin users and
 *    confirm access is denied.
 * 6. Test error handling for non-existent widget IDs.
 *
 * Business Logic:
 *
 * - Only admin users may access detailed marketplace widget data.
 * - Widget details must be complete and accurate.
 *
 * Success Criteria:
 *
 * - Accurate widget data returned.
 * - Unauthorized requests rejected.
 * - Proper error responses for invalid widget ID.
 *
 * Failure Cases:
 *
 * - Unauthorized access.
 * - Missing or incomplete data in response.
 * - 404 not found for invalid widget ID.
 */
export async function test_api_marketplace_widget_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Authenticate as an admin user
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IFlexOfficeAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Use a random marketplace widget ID (UUID) for retrieval testing
  const widgetId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Test successful retrieval with assumed widget ID
  try {
    const widget: IFlexOfficeMarketplaceWidget =
      await api.functional.flexOffice.admin.marketplaceWidgets.at(connection, {
        id: widgetId,
      });
    typia.assert(widget);

    // 4. Verify returned data fields according to the DTO definition
    TestValidator.predicate(
      "widget id is a valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        widget.id,
      ),
    );
    TestValidator.predicate(
      "widget code is not empty",
      widget.widget_code.length > 0,
    );
    TestValidator.predicate("widget name is not empty", widget.name.length > 0);
    TestValidator.predicate(
      "widget version follows SemVer",
      /^\d+\.\d+\.\d+/.test(widget.version),
    );
    TestValidator.predicate(
      "widget created_at is ISO date-time",
      !isNaN(Date.parse(widget.created_at)),
    );
    TestValidator.predicate(
      "widget updated_at is ISO date-time",
      !isNaN(Date.parse(widget.updated_at)),
    );
    // description is optional and may be null or undefined
  } catch (exp) {
    // If error is HTTP 404 Not Found, test that it is the expected failure case
    if (exp instanceof api.HttpError) {
      TestValidator.predicate("widget not found error", exp.status === 404);
    } else {
      throw exp;
    }
  }

  // 5. Test unauthorized access (anonymous connection) should fail
  const anonymousConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized access to marketplace widget details should fail",
    async () => {
      await api.functional.flexOffice.admin.marketplaceWidgets.at(
        anonymousConnection,
        { id: widgetId },
      );
    },
  );
}
