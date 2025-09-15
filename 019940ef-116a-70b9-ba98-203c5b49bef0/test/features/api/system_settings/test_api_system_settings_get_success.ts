import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";
import type { IJobPerformanceEvalSystemSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalSystemSettings";

/**
 * This test function verifies the success scenario of fetching a system
 * setting by ID for an authorized manager.
 *
 * The test workflow includes:
 *
 * 1. Create a manager user and establish an authenticated session via the
 *    manager join endpoint.
 * 2. Retrieve a system setting by ID with the authenticated session.
 * 3. Assert that the retrieved system setting matches the expected structure
 *    including required fields.
 * 4. Confirm proper handling of optional fields such as description and
 *    deleted_at.
 * 5. Use typia.assert to ensure strict type validation of responses.
 *
 * This test validates both authentication and proper data retrieval for the
 * systemSettings.at endpoint.
 */
export async function test_api_system_settings_get_success(
  connection: api.IConnection,
) {
  // 1. Create manager user and authenticate
  const managerEmail: string = typia.random<string & tags.Format<"email">>();
  const managerPassword = "P@ssw0rd123";

  const manager: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.join(connection, {
      body: {
        email: managerEmail,
        password: managerPassword,
        name: RandomGenerator.name(),
      } satisfies IJobPerformanceEvalManager.ICreate,
    });
  typia.assert(manager);

  // 2. Retrieve system setting by ID
  const systemSettingId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const systemSetting: IJobPerformanceEvalSystemSettings =
    await api.functional.jobPerformanceEval.manager.systemSettings.at(
      connection,
      { id: systemSettingId },
    );
  typia.assert(systemSetting);

  // 3. Validate required properties exist
  TestValidator.predicate(
    "Ensure systemSetting.id is a non-empty string",
    typeof systemSetting.id === "string" && systemSetting.id.length > 0,
  );
  TestValidator.predicate(
    "Ensure systemSetting.setting_key is a non-empty string",
    typeof systemSetting.setting_key === "string" &&
      systemSetting.setting_key.length > 0,
  );
  TestValidator.predicate(
    "Ensure systemSetting.setting_value is a non-empty string",
    typeof systemSetting.setting_value === "string" &&
      systemSetting.setting_value.length > 0,
  );
  TestValidator.predicate(
    "Ensure systemSetting.created_at is a string",
    typeof systemSetting.created_at === "string",
  );
  TestValidator.predicate(
    "Ensure systemSetting.updated_at is a string",
    typeof systemSetting.updated_at === "string",
  );

  // 4. Optional fields validation
  TestValidator.predicate(
    "Optional field description is either string or null or undefined",
    systemSetting.description === null ||
      systemSetting.description === undefined ||
      typeof systemSetting.description === "string",
  );
  TestValidator.predicate(
    "Optional field deleted_at is either string (date-time) or null or undefined",
    systemSetting.deleted_at === null ||
      systemSetting.deleted_at === undefined ||
      typeof systemSetting.deleted_at === "string",
  );
}
