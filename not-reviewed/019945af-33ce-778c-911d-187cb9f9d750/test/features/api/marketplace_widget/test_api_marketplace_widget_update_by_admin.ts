import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficeMarketplaceWidget } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeMarketplaceWidget";

/**
 * Test updating an existing marketplace widget with an admin account.
 *
 * This test performs a full business cycle:
 *
 * 1. Admin user joins.
 * 2. Admin user logs in.
 * 3. Retrieve or simulate creating an existing marketplace widget.
 * 4. Update the widget's allowed properties (name, version, description).
 * 5. Check that widget_code remains unchanged.
 * 6. Verify update via GET endpoint.
 */
export async function test_api_marketplace_widget_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin join
  const adminCreateInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password123",
  } satisfies IFlexOfficeAdmin.ICreate;
  const admin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateInput,
    });
  typia.assert(admin);

  // 2. Admin login
  const adminLoginInput = {
    email: adminCreateInput.email,
    password: adminCreateInput.password,
  } satisfies IFlexOfficeAdmin.ILogin;
  const login: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginInput,
    });
  typia.assert(login);

  // 3. We simulate creation or retrieval of an existing widget by fetching a random widget ID until we get a valid one.
  // Since no create API is given, we try to retrieve a random one until no error.

  // Let's generate a UUID and attempt to fetch the widget.
  // We limit retries to avoid endless loops (simulate API test environment).

  let existingWidget: IFlexOfficeMarketplaceWidget | null = null;
  const maxRetries = 3;
  for (let attempt = 0; attempt < maxRetries; ++attempt) {
    const candidateId = typia.random<string & tags.Format<"uuid">>();
    try {
      existingWidget =
        await api.functional.flexOffice.admin.marketplaceWidgets.at(
          connection,
          { id: candidateId },
        );
      typia.assert(existingWidget);
      // Successfully got a widget
      break;
    } catch {
      // Ignore and retry
    }
  }

  if (existingWidget === null) {
    throw new Error(
      `Failed to retrieve an existing widget for update test after ${maxRetries} attempts`,
    );
  }

  // 4. Prepare update data
  const updatePayload = {
    // widget_code update should be ignored/unchanged as per business logic, so omit it deliberately here
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    version: `${RandomGenerator.alphaNumeric(1)}.${RandomGenerator.alphaNumeric(1)}.${RandomGenerator.alphaNumeric(1)}`,
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 10,
      sentenceMax: 15,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IFlexOfficeMarketplaceWidget.IUpdate;

  // 5. Call update
  const updatedWidget: IFlexOfficeMarketplaceWidget =
    await api.functional.flexOffice.admin.marketplaceWidgets.updateMarketplaceWidget(
      connection,
      {
        id: existingWidget.id,
        body: updatePayload,
      },
    );
  typia.assert(updatedWidget);

  // 6. Validate response reflects updates
  TestValidator.equals(
    `Updated name matches for widget id ${updatedWidget.id}`,
    updatedWidget.name,
    updatePayload.name,
  );
  TestValidator.equals(
    `Updated version matches for widget id ${updatedWidget.id}`,
    updatedWidget.version,
    updatePayload.version,
  );
  TestValidator.equals(
    `Updated description matches for widget id ${updatedWidget.id}`,
    updatedWidget.description,
    updatePayload.description,
  );

  // Widget code must remain unchanged
  TestValidator.equals(
    `Widget code should remain unchanged for widget id ${updatedWidget.id}`,
    updatedWidget.widget_code,
    existingWidget.widget_code,
  );

  // updated_at must be newer or equal than created_at
  TestValidator.predicate(
    `updated_at timestamp valid for widget id ${updatedWidget.id}`,
    new Date(updatedWidget.updated_at).getTime() >=
      new Date(updatedWidget.created_at).getTime(),
  );

  // 7. Confirm updates persisted by GET
  const confirmedWidget: IFlexOfficeMarketplaceWidget =
    await api.functional.flexOffice.admin.marketplaceWidgets.at(connection, {
      id: updatedWidget.id,
    });
  typia.assert(confirmedWidget);

  TestValidator.equals(
    `Confirmed GET name matches for widget id ${confirmedWidget.id}`,
    confirmedWidget.name,
    updatePayload.name,
  );
  TestValidator.equals(
    `Confirmed GET version matches for widget id ${confirmedWidget.id}`,
    confirmedWidget.version,
    updatePayload.version,
  );
  TestValidator.equals(
    `Confirmed GET description matches for widget id ${confirmedWidget.id}`,
    confirmedWidget.description,
    updatePayload.description,
  );
  TestValidator.equals(
    `Confirmed GET widget_code unchanged for widget id ${confirmedWidget.id}`,
    confirmedWidget.widget_code,
    existingWidget.widget_code,
  );

  TestValidator.predicate(
    `Confirmed updated_at timestamp valid for widget id ${confirmedWidget.id}`,
    new Date(confirmedWidget.updated_at).getTime() >=
      new Date(confirmedWidget.created_at).getTime(),
  );
}
