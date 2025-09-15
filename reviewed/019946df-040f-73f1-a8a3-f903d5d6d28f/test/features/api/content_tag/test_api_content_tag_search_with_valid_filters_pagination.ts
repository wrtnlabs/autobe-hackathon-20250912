import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsContentTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentTag";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEnterpriseLmsContentTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsContentTag";

/**
 * This E2E test validates the content tag search API for organizationAdmin
 * users with focus on valid filters, pagination, and sorting.
 *
 * The test first authenticates by joining and logging in an organizationAdmin
 * user to obtain authorization tokens.
 *
 * It then performs a content tag search filtering by tag code and name with
 * pagination parameters (page, limit) and ordering by name ascending.
 *
 * The test verifies the returned summaries match search filters and pagination
 * metadata is correct.
 *
 * The test also attempts searches with invalid filters to confirm errors are
 * returned properly.
 *
 * Finally, it verifies that unauthorized attempts to access the content tag
 * search endpoint are rejected, confirming access control.
 *
 * Every API response is validated with typia.assert for type safety and
 * TestValidator functions validate logical correctness of pagination,
 * filtering, and access control.
 *
 * The test follows a complete, realistic business workflow for the content tag
 * search feature for organizationAdmin users, ensuring robust coverage and
 * compliance.
 */
export async function test_api_content_tag_search_with_valid_filters_pagination(
  connection: api.IConnection,
) {
  // 1. Organization Admin join (create account)
  const tenantId: string = typia.random<string & tags.Format<"uuid">>();
  const email: string = typia.random<string & tags.Format<"email">>();
  const password: string = "abcDef123!";

  const organizationAdmin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        tenant_id: tenantId,
        email: email,
        password: password,
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
      } satisfies IEnterpriseLmsOrganizationAdmin.ICreate,
    });
  typia.assert(organizationAdmin);

  // 2. Organization Admin login
  const login: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.login(connection, {
      body: {
        email: email,
        password: password,
      } satisfies IEnterpriseLmsOrganizationAdmin.ILogin,
    });
  typia.assert(login);

  // Prepare valid filter for search: use part of code and name from random strings
  const filterCode = RandomGenerator.alphabets(3);
  const filterName = RandomGenerator.alphabets(3);

  // Prepare contentTagRequest with pagination and ordering
  const validContentTagRequest = {
    code: filterCode,
    name: filterName,
    page: 1,
    limit: 2,
    order_by: "name",
    order_direction: "asc",
  } satisfies IEnterpriseLmsContentTag.IRequest;

  // 3. Call contentTags.indexContentTag with valid filters, pagination and ordering
  const pageResult: IPageIEnterpriseLmsContentTag.ISummary =
    await api.functional.enterpriseLms.organizationAdmin.contentTags.indexContentTag(
      connection,
      { body: validContentTagRequest },
    );
  typia.assert(pageResult);

  // Validate pagination metadata
  TestValidator.predicate(
    "page.number is positive",
    pageResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "page.limit is positive",
    pageResult.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "page.records >= number of returned items",
    pageResult.pagination.records >= pageResult.data.length,
  );
  TestValidator.predicate(
    "page.pages >= current page",
    pageResult.pagination.pages >= pageResult.pagination.current,
  );

  // Validate data content matches filters where possible
  for (const tag of pageResult.data) {
    TestValidator.predicate(
      "each item code contains filterCode",
      tag.code.includes(filterCode),
    );
    TestValidator.predicate(
      "each item name contains filterName",
      tag.name.includes(filterName),
    );
  }

  // Validate order is ascending by name
  for (let i = 1; i < pageResult.data.length; i++) {
    TestValidator.predicate(
      `sorted ascending by name: ${pageResult.data[i - 1].name} <= ${pageResult.data[i].name}`,
      pageResult.data[i - 1].name <= pageResult.data[i].name,
    );
  }

  // 4. Test: invalid filter parameters: illegal order_direction
  const invalidRequest = {
    ...validContentTagRequest,
    order_direction: "invalid" as unknown as string,
  } satisfies IEnterpriseLmsContentTag.IRequest;

  await TestValidator.error(
    "invalid order_direction causes error",
    async () => {
      await api.functional.enterpriseLms.organizationAdmin.contentTags.indexContentTag(
        connection,
        { body: invalidRequest },
      );
    },
  );

  // 5. Unauthorized access attempt: using unauthenticated connection
  // For safety, create a new un-auth connection without Authorization header
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error("unauthorized access is forbidden", async () => {
    await api.functional.enterpriseLms.organizationAdmin.contentTags.indexContentTag(
      unauthConn,
      { body: validContentTagRequest },
    );
  });
}
