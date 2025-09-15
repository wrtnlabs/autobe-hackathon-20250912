import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditor";
import type { IFlexOfficeMarketplaceWidget } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeMarketplaceWidget";

/**
 * Test the detail retrieval of a marketplace widget by an authenticated
 * Editor user.
 *
 * This test covers the entire flow:
 *
 * 1. Register and authenticate an Editor user.
 * 2. Log in the Editor user to obtain authorization.
 * 3. Retrieve marketplace widget details with a random widget UUID.
 * 4. Validate that the retrieved widget details have all required fields, and
 *    fields have valid formats and types.
 *
 * This verifies that Editor role authorization works and the API returns
 * correct details without error.
 */
export async function test_api_marketplace_widget_retrieve_details(
  connection: api.IConnection,
) {
  // 1. Create a new Editor user with valid credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = "StrongPass123";
  const createBody = {
    name: RandomGenerator.name(),
    email: email,
    password: password,
  } satisfies IFlexOfficeEditor.ICreate;
  const joinResponse = await api.functional.auth.editor.join(connection, {
    body: createBody,
  });
  typia.assert(joinResponse);

  // 2. Login as Editor user
  const loginBody = {
    email: email,
    password: password,
  } satisfies IFlexOfficeEditor.ILogin;
  const loginResponse = await api.functional.auth.editor.login(connection, {
    body: loginBody,
  });
  typia.assert(loginResponse);

  // 3. Prepare a UUID for marketplace widget retrieval (assumed to exist)
  const widgetId = typia.random<string & tags.Format<"uuid">>();

  // 4. Retrieve marketplace widget details
  const widget = await api.functional.flexOffice.editor.marketplaceWidgets.at(
    connection,
    { id: widgetId },
  );
  typia.assert(widget);

  // 5. Validate response fields
  TestValidator.predicate(
    "widget id is UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      widget.id,
    ),
  );
  TestValidator.predicate(
    "widget has valid widget_code",
    typeof widget.widget_code === "string" && widget.widget_code.length > 0,
  );
  TestValidator.predicate(
    "widget has valid name",
    typeof widget.name === "string" && widget.name.length > 0,
  );
  TestValidator.predicate(
    "widget has valid version",
    typeof widget.version === "string" && widget.version.length > 0,
  );

  if (widget.description !== null && widget.description !== undefined) {
    TestValidator.predicate(
      "widget description is string",
      typeof widget.description === "string",
    );
  }

  TestValidator.predicate(
    "widget created_at is ISO date",
    typeof widget.created_at === "string" &&
      !isNaN(Date.parse(widget.created_at)),
  );
  TestValidator.predicate(
    "widget updated_at is ISO date",
    typeof widget.updated_at === "string" &&
      !isNaN(Date.parse(widget.updated_at)),
  );

  if (widget.deleted_at !== null && widget.deleted_at !== undefined) {
    TestValidator.predicate(
      "widget deleted_at is ISO date",
      typeof widget.deleted_at === "string" &&
        !isNaN(Date.parse(widget.deleted_at)),
    );
  }
}
