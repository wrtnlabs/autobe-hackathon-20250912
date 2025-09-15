import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowSystemAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageINotificationWorkflowSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageINotificationWorkflowSystemAdmin";

export async function test_api_system_admin_search_system_admins_success(
  connection: api.IConnection,
) {
  // 1. Create a system administrator user by joining (registering) with a random valid email and password
  const generatedName = RandomGenerator.name(1)
    .replace(/\s+/g, "")
    .toLowerCase();
  const generatedNumber =
    typia.random<number & tags.Type<"uint32">>() % 1000000000;
  const email = `${generatedName}${generatedNumber}@example.com`;
  const password = `Passw0rd!${generatedNumber}`;

  const authorizedAdmin: INotificationWorkflowSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email,
        password,
      } satisfies INotificationWorkflowSystemAdmin.IRequestJoin,
    });
  typia.assert(authorizedAdmin);

  // 2. Compose the search request with email filter substring and pagination parameters
  const emailFilter = email.substring(0, Math.min(email.length, 3));
  const page = typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>();
  const limit = typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>();

  const searchRequest = {
    email: emailFilter,
    page: page satisfies number as number,
    limit: limit satisfies number as number,
  } satisfies INotificationWorkflowSystemAdmin.IRequest;

  // 3. Execute the search to retrieve filtered system admin page
  const pageResult: IPageINotificationWorkflowSystemAdmin.ISummary =
    await api.functional.notificationWorkflow.systemAdmin.systemAdmins.search(
      connection,
      {
        body: searchRequest,
      },
    );
  typia.assert(pageResult);

  // 4. Validate pagination fields
  TestValidator.predicate(
    "pagination current page is positive",
    pageResult.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    pageResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination total records non-negative",
    pageResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination total pages positive",
    pageResult.pagination.pages > 0,
  );

  // 5. Validate each system admin in the returned data has email including filter substring
  for (const admin of pageResult.data) {
    typia.assert(admin);
    TestValidator.predicate(
      `admin email ${admin.email} includes filter substring`,
      admin.email.includes(emailFilter),
    );
  }
}
