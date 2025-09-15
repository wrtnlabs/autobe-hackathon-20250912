import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRecipeSharingUnits } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRecipeSharingUnits";
import type { IRecipeSharingUnits } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingUnits";

export async function test_api_units_index_invalid_pagination(
  connection: api.IConnection,
) {
  // Attempt to retrieve units with negative page number
  await TestValidator.error(
    "negative page number triggers validation error",
    async () => {
      await api.functional.recipeSharing.units.index(connection, {
        body: {
          page: -1,
          limit: 100,
          code: null,
          name: null,
          abbreviation: null,
        } satisfies IRecipeSharingUnits.IRequest,
      });
    },
  );

  // Attempt to retrieve units with negative limit value
  await TestValidator.error(
    "negative limit triggers validation error",
    async () => {
      await api.functional.recipeSharing.units.index(connection, {
        body: {
          page: 1,
          limit: -10,
          code: null,
          name: null,
          abbreviation: null,
        } satisfies IRecipeSharingUnits.IRequest,
      });
    },
  );
}
