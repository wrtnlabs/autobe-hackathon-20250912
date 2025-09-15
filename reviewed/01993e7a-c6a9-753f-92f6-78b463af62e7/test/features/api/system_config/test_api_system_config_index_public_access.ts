import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRecipeSharingSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRecipeSharingSystemConfig";
import type { IRecipeSharingSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingSystemConfig";

export async function test_api_system_config_index_public_access(
  connection: api.IConnection,
) {
  // Call the systemConfig index endpoint with empty filters to simulate public, unauthenticated access
  const requestBody = {} satisfies IRecipeSharingSystemConfig.IRequest;

  const output: IPageIRecipeSharingSystemConfig =
    await api.functional.recipeSharing.systemConfig.index(connection, {
      body: requestBody,
    });

  // Validate response data structure and integrity
  typia.assert(output);

  // Validate pagination properties
  TestValidator.predicate(
    "pagination current page is non-negative",
    output.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    output.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    output.pagination.pages >= 0,
  );

  // Validate data length consistency with records
  TestValidator.predicate(
    "data array length should be less or equal to records",
    output.data.length <= output.pagination.records,
  );

  // Additional business logic checks on data items
  for (const config of output.data) {
    typia.assert(config);
    // id is string (uuid format confirmed by typia.assert)
    TestValidator.predicate(
      "config id is non-empty string",
      typeof config.id === "string" && config.id.length > 0,
    );
    // key is non-empty string
    TestValidator.predicate(
      "config key is non-empty string",
      typeof config.key === "string" && config.key.length > 0,
    );
    // value is string (could be empty)
    TestValidator.predicate(
      "config value is string",
      typeof config.value === "string",
    );
    // description is either string or null or undefined
    TestValidator.predicate(
      "config description is string or null or undefined",
      config.description === null ||
        config.description === undefined ||
        typeof config.description === "string",
    );
    // created_at and updated_at are strings (date-time format enforced by typia.assert)
    TestValidator.predicate(
      "created_at is non-empty string",
      typeof config.created_at === "string" && config.created_at.length > 0,
    );
    TestValidator.predicate(
      "updated_at is non-empty string",
      typeof config.updated_at === "string" && config.updated_at.length > 0,
    );
  }
}
