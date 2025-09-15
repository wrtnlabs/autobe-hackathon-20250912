import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeViewer } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeViewer";
import type { IFlexOfficeWidget } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeWidget";

/**
 * Validate that a viewer user can retrieve details of a widget on a
 * FlexOffice UI page.
 *
 * This test covers registering and authenticating a viewer user to acquire
 * valid JWT tokens, then fetching widget details by specified pageId and
 * widgetId using the GET endpoint. It validates the response data matches
 * the IFlexOfficeWidget schema, including id, flex_office_page_id,
 * widget_type, name, timestamps, and optional fields.
 *
 * The test ensures proper API authorization and that viewer role access is
 * respected.
 */
export async function test_api_flex_office_viewer_page_widget_detail_retrieval_success(
  connection: api.IConnection,
) {
  // 1. Create and authenticate a viewer user
  const viewerCreateBody = {
    name: "Viewer User",
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password1234",
  } satisfies IFlexOfficeViewer.ICreate;

  const authorized: IFlexOfficeViewer.IAuthorized =
    await api.functional.auth.viewer.join(connection, {
      body: viewerCreateBody,
    });
  typia.assert(authorized);

  // 2. Generate UUIDs for pageId and widgetId
  const pageId = typia.random<string & tags.Format<"uuid">>();
  const widgetId = typia.random<string & tags.Format<"uuid">>();

  // 3. Fetch the widget details
  const widget: IFlexOfficeWidget =
    await api.functional.flexOffice.viewer.pages.widgets.at(connection, {
      pageId,
      widgetId,
    });
  typia.assert(widget);

  // 4. Validate response fields
  TestValidator.predicate(
    "widget id is a uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      widget.id,
    ),
  );
  TestValidator.equals(
    "widget page id matches request",
    widget.flex_office_page_id,
    pageId,
  );
  TestValidator.predicate(
    "widget type is a non-empty string",
    typeof widget.widget_type === "string" && widget.widget_type.length > 0,
  );
  TestValidator.predicate(
    "widget name is a non-empty string",
    typeof widget.name === "string" && widget.name.length > 0,
  );
  TestValidator.predicate(
    "widget created_at is an ISO date string",
    !isNaN(Date.parse(widget.created_at)),
  );
  TestValidator.predicate(
    "widget updated_at is an ISO date string",
    !isNaN(Date.parse(widget.updated_at)),
  );
  TestValidator.predicate(
    "widget configuration is string or null or undefined",
    typeof widget.configuration === "string" ||
      widget.configuration === null ||
      widget.configuration === undefined,
  );
  TestValidator.predicate(
    "widget deleted_at is null, undefined or ISO date string",
    widget.deleted_at === null ||
      widget.deleted_at === undefined ||
      (typeof widget.deleted_at === "string" &&
        !isNaN(Date.parse(widget.deleted_at))),
  );
}
