import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";
import type { IEnterpriseLmsSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemConfiguration";
import type { IEnterpriseLmsSystemConfigurations } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemConfigurations";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEnterpriseLmsSystemConfigurations } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsSystemConfigurations";

/**
 * Validate searching system configurations with pagination.
 *
 * This test executes the entire flow of systemAdmin user registration, multiple
 * system configuration creations, and search with pagination using filters.
 *
 * It validates authorization, data creation integrity, pagination calculation,
 * and filtered search results.
 *
 * Steps:
 *
 * 1. Register systemAdmin user with join API.
 * 2. Create multiple system configurations with unique keys and values.
 * 3. Search with PATCH API using filters and pagination parameters.
 * 4. Assert pagination correctness and filtered data match the criteria.
 */
export async function test_api_system_configuration_search_pagination(
  connection: api.IConnection,
) {
  // 1. systemAdmin join and authenticate
  const systemAdminInput: IEnterpriseLmsSystemAdmin.ICreate = {
    email: RandomGenerator.alphaNumeric(10) + "@test.com",
    password_hash: RandomGenerator.alphaNumeric(32),
    first_name: RandomGenerator.name(),
    last_name: RandomGenerator.name(),
    status: "active",
  };
  const admin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: systemAdminInput,
    });
  typia.assert(admin);

  // 2. Create multiple system configurations
  const configCount = 10;
  const configs: IEnterpriseLmsSystemConfiguration[] = [];
  for (let i = 0; i < configCount; i++) {
    // Create unique key and value
    const configCreate: IEnterpriseLmsSystemConfiguration.ICreate = {
      key: `config_key_${RandomGenerator.alphaNumeric(6)}_${i}`,
      value: `config_value_${RandomGenerator.alphaNumeric(10)}`,
      description:
        i % 2 === 0
          ? `desc_${RandomGenerator.paragraph({ sentences: 3 })}`
          : null,
    };
    const createdConfig =
      await api.functional.enterpriseLms.systemAdmin.systemConfigurations.create(
        connection,
        { body: configCreate },
      );
    typia.assert(createdConfig);
    configs.push(createdConfig);
  }

  // 3. Search system configurations with pagination and filter for keys containing "config_key"
  const searchRequest1: IEnterpriseLmsSystemConfigurations.IRequest = {
    page: 1,
    limit: 5,
    key: "config_key",
    order_by: "key",
    order_dir: "asc",
  };
  const pageResult1 =
    await api.functional.enterpriseLms.systemAdmin.systemConfigurations.index(
      connection,
      { body: searchRequest1 },
    );
  typia.assert(pageResult1);
  TestValidator.predicate(
    "pagination current page matches request",
    pageResult1.pagination.current === searchRequest1.page,
  );
  TestValidator.predicate(
    "pagination limit matches request",
    pageResult1.pagination.limit === searchRequest1.limit,
  );
  TestValidator.predicate(
    "pagination records is at least the number of created configs",
    pageResult1.pagination.records >= configCount,
  );
  TestValidator.predicate(
    "page count is correct",
    pageResult1.pagination.pages >= 1 &&
      pageResult1.pagination.pages ===
        Math.ceil(
          pageResult1.pagination.records / pageResult1.pagination.limit,
        ),
  );
  TestValidator.predicate(
    "all results key contain filter substring",
    pageResult1.data.every((item) => item.key.includes("config_key")),
  );

  // 4. Search with value filter using part of a known created config value to test filtering
  const filterValue = configs[3].value.slice(0, 6);
  const searchRequest2: IEnterpriseLmsSystemConfigurations.IRequest = {
    page: 1,
    limit: 10,
    value: filterValue,
  };
  const pageResult2 =
    await api.functional.enterpriseLms.systemAdmin.systemConfigurations.index(
      connection,
      { body: searchRequest2 },
    );
  typia.assert(pageResult2);
  TestValidator.predicate(
    "all results value contain filter substring",
    pageResult2.data.every((item) => item.value.includes(filterValue)),
  );

  // 5. Search with description filter including null description
  const searchRequest3: IEnterpriseLmsSystemConfigurations.IRequest = {
    page: 1,
    limit: 15,
    description: "desc_",
  };
  const pageResult3 =
    await api.functional.enterpriseLms.systemAdmin.systemConfigurations.index(
      connection,
      { body: searchRequest3 },
    );
  typia.assert(pageResult3);
  TestValidator.predicate(
    "all result descriptions contain filter substring or are null",
    pageResult3.data.every(
      (item) =>
        item.description === null || (item.description ?? "").includes("desc_"),
    ),
  );

  // 6. Check pagination behavior for page 2 with limit 3 to verify correct page slicing
  if (pageResult1.pagination.pages >= 2) {
    const searchRequestPage2: IEnterpriseLmsSystemConfigurations.IRequest = {
      page: 2,
      limit: 3,
      key: "config_key",
    };
    const pageResultPage2 =
      await api.functional.enterpriseLms.systemAdmin.systemConfigurations.index(
        connection,
        { body: searchRequestPage2 },
      );
    typia.assert(pageResultPage2);
    TestValidator.equals(
      "pagination current page is 2",
      pageResultPage2.pagination.current,
      2,
    );
    TestValidator.equals(
      "pagination limit is 3",
      pageResultPage2.pagination.limit,
      3,
    );
    TestValidator.predicate(
      "page 2 data matches key filter",
      pageResultPage2.data.every((item) => item.key.includes("config_key")),
    );
    TestValidator.equals(
      "records count unchanged",
      pageResultPage2.pagination.records,
      pageResult1.pagination.records,
    );
  }
}
