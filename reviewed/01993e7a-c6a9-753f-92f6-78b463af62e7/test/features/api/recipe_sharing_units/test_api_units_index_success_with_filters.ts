import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRecipeSharingUnits } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRecipeSharingUnits";
import type { IRecipeSharingUnits } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingUnits";

export async function test_api_units_index_success_with_filters(
  connection: api.IConnection,
) {
  // 1. Test default paging with empty filter - expect some data and correct pagination.
  const defaultResponse: IPageIRecipeSharingUnits.ISummary =
    await api.functional.recipeSharing.units.index(connection, { body: {} });
  typia.assert(defaultResponse);
  TestValidator.predicate(
    "default page should be at least 0",
    defaultResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit should be positive",
    defaultResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records should not be negative",
    defaultResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages should be at least 1",
    defaultResponse.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "data length should not exceed limit",
    defaultResponse.data.length <= defaultResponse.pagination.limit,
  );

  // 2. Test paging with specific page and limit
  const page: number = 1;
  const limit: number = 5;
  const pagedResponse: IPageIRecipeSharingUnits.ISummary =
    await api.functional.recipeSharing.units.index(connection, {
      body: { page, limit },
    });
  typia.assert(pagedResponse);
  TestValidator.equals(
    "page should match",
    pagedResponse.pagination.current,
    page,
  );
  TestValidator.equals(
    "limit should match",
    pagedResponse.pagination.limit,
    limit,
  );
  TestValidator.predicate(
    "data length should not exceed limit",
    pagedResponse.data.length <= limit,
  );

  // 3. Test filtering by code partial
  if (defaultResponse.data.length > 0) {
    const codeRaw = defaultResponse.data[0].code;
    const codeFragment =
      codeRaw.length > 0
        ? codeRaw.substring(0, Math.min(3, codeRaw.length))
        : "";
    if (codeFragment !== "") {
      const filteredByCode: IPageIRecipeSharingUnits.ISummary =
        await api.functional.recipeSharing.units.index(connection, {
          body: { code: codeFragment },
        });
      typia.assert(filteredByCode);
      TestValidator.predicate(
        "data items should match code filter",
        filteredByCode.data.every((u) => u.code.includes(codeFragment)),
      );
    }
  }

  // 4. Test filtering by name partial
  if (defaultResponse.data.length > 0) {
    const nameRaw = defaultResponse.data[0].name;
    const nameFragment =
      nameRaw.length > 0
        ? nameRaw.substring(0, Math.min(3, nameRaw.length))
        : "";
    if (nameFragment !== "") {
      const filteredByName: IPageIRecipeSharingUnits.ISummary =
        await api.functional.recipeSharing.units.index(connection, {
          body: { name: nameFragment },
        });
      typia.assert(filteredByName);
      TestValidator.predicate(
        "data items should match name filter",
        filteredByName.data.every((u) => u.name.includes(nameFragment)),
      );
    }
  }

  // 5. Test filtering by abbreviation partial if abbreviation exists
  if (
    defaultResponse.data.some(
      (u) => u.abbreviation !== null && u.abbreviation !== undefined,
    )
  ) {
    const abbrevUnit = defaultResponse.data.find(
      (u) => u.abbreviation !== null && u.abbreviation !== undefined,
    )!;
    const abbrevRaw = abbrevUnit.abbreviation ?? "";
    const abbrevFragment =
      abbrevRaw.length > 0
        ? abbrevRaw.substring(0, Math.min(2, abbrevRaw.length))
        : "";
    if (abbrevFragment !== "") {
      const filteredByAbbrev: IPageIRecipeSharingUnits.ISummary =
        await api.functional.recipeSharing.units.index(connection, {
          body: { abbreviation: abbrevFragment },
        });
      typia.assert(filteredByAbbrev);
      TestValidator.predicate(
        "data items should match abbreviation filter",
        filteredByAbbrev.data.every(
          (u) =>
            u.abbreviation !== null &&
            u.abbreviation !== undefined &&
            u.abbreviation.includes(abbrevFragment),
        ),
      );
    }
  }
}
