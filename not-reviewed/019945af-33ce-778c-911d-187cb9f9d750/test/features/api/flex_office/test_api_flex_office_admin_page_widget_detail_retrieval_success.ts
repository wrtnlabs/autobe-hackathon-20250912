import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficeWidget } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeWidget";

/**
 * Validates detailed retrieval of a UI widget on a FlexOffice admin page.
 *
 * This test performs the following steps:
 *
 * 1. Creates and authenticates an admin user with necessary permissions via
 *    /auth/admin/join.
 * 2. Attempts to retrieve widget details using GET
 *    /flexOffice/admin/pages/{pageId}/widgets/{widgetId}.
 * 3. Validates the success response contains complete widget data conforming
 *    to the IFlexOfficeWidget schema.
 * 4. Checks for error handling on unauthorized access, invalid UUID inputs,
 *    and non-existent resources.
 *
 * The test ensures authentication tokens are handled automatically by the
 * SDK. It asserts response types to guarantee type safety and confirms
 * business rules for access control.
 */
export async function test_api_flex_office_admin_page_widget_detail_retrieval_success(
  connection: api.IConnection,
) {
  // 1. Admin user creation and authentication
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = "P@ssw0rd!";

  const admin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IFlexOfficeAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Attempt unauthorized access with a fresh connection without headers
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  // Use invalid UUID strings for validation failure tests
  const invalidUUID = "invalid-uuid-string";

  await TestValidator.error(
    "unauthorized access without token should fail",
    async () => {
      await api.functional.flexOffice.admin.pages.widgets.at(unauthConnection, {
        pageId: invalidUUID,
        widgetId: invalidUUID,
      });
    },
  );

  // 3. Attempt with valid UUIDs but widget/page do not exist
  const nonexistentPageId = typia.random<string & tags.Format<"uuid">>();
  const nonexistentWidgetId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "requesting non-existent widget should fail",
    async () => {
      await api.functional.flexOffice.admin.pages.widgets.at(connection, {
        pageId: nonexistentPageId,
        widgetId: nonexistentWidgetId,
      });
    },
  );

  // 4. Create realistic sample UUIDs for pageId and widgetId
  const pageId = typia.random<string & tags.Format<"uuid">>();
  const widgetId = typia.random<string & tags.Format<"uuid">>();

  // 5. Retrieve detailed widget info
  const widget: IFlexOfficeWidget =
    await api.functional.flexOffice.admin.pages.widgets.at(connection, {
      pageId: pageId,
      widgetId: widgetId,
    });
  typia.assert(widget);

  // Validate key properties presence and types
  TestValidator.predicate(
    "widget id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      widget.id,
    ),
  );
  TestValidator.equals(
    "widget page ID matches request",
    widget.flex_office_page_id,
    pageId,
  );
  TestValidator.predicate(
    "widget type is non-empty",
    typeof widget.widget_type === "string" && widget.widget_type.length > 0,
  );
  TestValidator.predicate(
    "widget name is non-empty",
    typeof widget.name === "string" && widget.name.length > 0,
  );
  if (widget.configuration === null || widget.configuration === undefined) {
    TestValidator.equals(
      "widget configuration is null or undefined",
      widget.configuration,
      widget.configuration,
    );
  } else {
    TestValidator.predicate(
      "widget configuration is JSON string",
      typeof widget.configuration === "string",
    );
  }
  TestValidator.predicate(
    "widget created_at is ISO date-time",
    typeof widget.created_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z$/.test(widget.created_at),
  );
  TestValidator.predicate(
    "widget updated_at is ISO date-time",
    typeof widget.updated_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z$/.test(widget.updated_at),
  );
  if (widget.deleted_at === null || widget.deleted_at === undefined) {
    TestValidator.equals(
      "widget deleted_at is null or undefined",
      widget.deleted_at,
      widget.deleted_at,
    );
  } else {
    TestValidator.predicate(
      "widget deleted_at is ISO date-time or null",
      typeof widget.deleted_at === "string" &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z$/.test(widget.deleted_at),
    );
  }
}
