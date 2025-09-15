import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IRecipeSharingSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingSystemConfig";

/**
 * Test retrieving a single system configuration entry by id.
 *
 * This test verifies that the API correctly fetches a system configuration
 * entry given a valid UUID identifier. It asserts that the returned object
 * contains all required fields including id, key, value, description
 * (optional), created_at, and updated_at timestamps in ISO 8601 format.
 *
 * Test steps:
 *
 * 1. Generate a random UUID string to simulate a configuration id.
 * 2. Call the API endpoint to fetch the configuration by id.
 * 3. Assert the returned object type matches IRecipeSharingSystemConfig.
 * 4. Validate that required fields are present and description property is
 *    correctly present or null.
 * 5. Confirm that timestamps follow ISO 8601 date-time format.
 */
export async function test_api_system_config_at_success(
  connection: api.IConnection,
) {
  // Generate valid UUID for configuration id
  const configId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Call API to get system configuration by id
  const systemConfig: IRecipeSharingSystemConfig =
    await api.functional.recipeSharing.systemConfig.at(connection, {
      id: configId,
    });
  typia.assert(systemConfig);

  // Validate basic fields
  TestValidator.predicate(
    "config has id",
    typeof systemConfig.id === "string" && systemConfig.id.length > 0,
  );
  TestValidator.predicate(
    "config has non-empty key",
    typeof systemConfig.key === "string" && systemConfig.key.length > 0,
  );
  TestValidator.predicate(
    "config has non-empty value",
    typeof systemConfig.value === "string",
  );

  // Description can be string or null or undefined but is optional, so accept null or undefined or string
  TestValidator.predicate(
    "config description is string/null/undefined",
    systemConfig.description === null ||
      systemConfig.description === undefined ||
      typeof systemConfig.description === "string",
  );

  // Validate created_at and updated_at are ISO 8601 date-time strings
  const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
  TestValidator.predicate(
    "config created_at is ISO 8601 date-time",
    iso8601Regex.test(systemConfig.created_at),
  );
  TestValidator.predicate(
    "config updated_at is ISO 8601 date-time",
    iso8601Regex.test(systemConfig.updated_at),
  );
}
