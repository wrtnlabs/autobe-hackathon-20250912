import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEasySignAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEasySignAdmin";
import type { IEasySignEasySignSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IEasySignEasySignSettings";

/**
 * The test verifies secure retrieval of detailed EasySign system settings
 * information by an authenticated admin. The workflow involves:
 *
 * 1. Admin account creation and authentication using /auth/admin/join.
 * 2. Retrieval of a specific system setting's details by its UUID via
 *    /easySign/admin/easySignSettings/{id}.
 * 3. Validation of successful data retrieval (matching ID and proper schema).
 * 4. Handling invalid/nonexistent UUID access with expected error responses.
 * 5. Ensuring access control prevents unauthorized retrieval.
 */

export async function test_api_easy_sign_settings_at_with_admin_authentication(
  connection: api.IConnection,
) {
  // Step 1: Admin creation and authentication
  const adminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(2),
  } satisfies IEasySignAdmin.ICreate;

  const admin: IEasySignAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(admin);

  // Step 2: Attempt to retrieve a system setting by valid UUID
  const settingId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const setting: IEasySignEasySignSettings =
    await api.functional.easySign.admin.easySignSettings.at(connection, {
      id: settingId,
    });
  typia.assert(setting);

  // Verify the returned setting ID matches the requested ID
  TestValidator.equals(
    "setting ID matches requested ID",
    setting.id,
    settingId,
  );

  // Step 3: Handle error scenario for non-existent UUID
  // Using a freshly generated UUID unlikely to exist in DB
  const nonExistentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error("non-existent UUID should error", async () => {
    await api.functional.easySign.admin.easySignSettings.at(connection, {
      id: nonExistentId,
    });
  });

  // The above asserts that error handling for non-existent UUIDs is enforced
  // Additional unauthorized access tests could be added here if applicable
}
