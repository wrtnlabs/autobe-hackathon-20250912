import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRecipeSharingSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRecipeSharingSystemConfig";
import type { IRecipeSharingSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingSystemConfig";

export async function test_api_system_config_index_success(
  connection: api.IConnection,
) {
  // 1. Define a realistic search request body with filters, pagination, and sorting
  const requestBody = {
    key: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 4,
      wordMax: 8,
    }).substring(0, 20),
    value: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 4,
      wordMax: 8,
    }).substring(0, 20),
    page: 1,
    limit: 10,
    order_by: "key asc",
  } satisfies IRecipeSharingSystemConfig.IRequest;

  // 2. Call the patch /recipeSharing/systemConfig API with the request body
  const output: IPageIRecipeSharingSystemConfig =
    await api.functional.recipeSharing.systemConfig.index(connection, {
      body: requestBody,
    });

  // 3. Assert the output type structure
  typia.assert(output);

  // 4. Validate pagination properties
  TestValidator.predicate(
    "pagination.current is a non-negative integer",
    typeof output.pagination.current === "number" &&
      output.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination.limit is a non-negative integer",
    typeof output.pagination.limit === "number" && output.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination.records is a non-negative integer",
    typeof output.pagination.records === "number" &&
      output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages is a non-negative integer",
    typeof output.pagination.pages === "number" && output.pagination.pages >= 0,
  );

  // 5. Validate pagination logic: pages >= 1 if records > 0, current page <= pages
  TestValidator.predicate(
    "pagination.pages consistent with records and limit",
    (output.pagination.records === 0 && output.pagination.pages === 0) ||
      (output.pagination.pages >= 1 && output.pagination.limit > 0),
  );
  TestValidator.predicate(
    "pagination.current is within total pages",
    output.pagination.current >= 0 &&
      output.pagination.current <= Math.max(1, output.pagination.pages),
  );

  // 6. Confirm that data is an array and each element conforms to IRecipeSharingSystemConfig
  TestValidator.predicate("data is an array", Array.isArray(output.data));

  for (const entry of output.data) typia.assert(entry);
}
