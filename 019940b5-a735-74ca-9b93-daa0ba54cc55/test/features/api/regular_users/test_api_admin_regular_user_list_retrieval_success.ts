import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationAdmin";
import type { IEventRegistrationRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationRegularUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEventRegistrationRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEventRegistrationRegularUser";

export async function test_api_admin_regular_user_list_retrieval_success(
  connection: api.IConnection,
) {
  // 1. Create an admin user to authenticate
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const passwordHash = RandomGenerator.alphaNumeric(32); // simulated hashed password
  const fullName = RandomGenerator.name();

  const admin: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.join.createAdminUser(connection, {
      body: {
        email: adminEmail,
        password_hash: passwordHash,
        full_name: fullName,
        phone_number: null,
        profile_picture_url: null,
        email_verified: true,
      } satisfies IEventRegistrationAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Prepare request body filter and pagination
  const filterRequest = {
    full_name: RandomGenerator.substring(admin.full_name) || undefined,
    email_verified: true,
    created_after: new Date(
      Date.now() - 1000 * 60 * 60 * 24 * 30,
    ).toISOString(), // 30 days ago
    created_before: new Date().toISOString(),
    page: 1,
    limit: 10,
  } satisfies IEventRegistrationRegularUser.IRequest;

  // 3. Call the regularUsers list API
  const listResponse: IPageIEventRegistrationRegularUser.ISummary =
    await api.functional.eventRegistration.admin.regularUsers.index(
      connection,
      {
        body: filterRequest,
      },
    );
  typia.assert(listResponse);

  // 4. Validate pagination properties
  TestValidator.predicate(
    "pagination current page is positive integer",
    listResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive integer",
    listResponse.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination pages count is not less than current",
    listResponse.pagination.pages >= listResponse.pagination.current,
  );
  TestValidator.predicate(
    "pagination records count is not negative",
    listResponse.pagination.records >= 0,
  );

  // 5. Validate each user summary in the data array
  listResponse.data.forEach((user) => {
    typia.assert(user);
    // Verify id format UUID
    TestValidator.predicate(
      `regular user id is UUID: ${user.id}`,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        user.id,
      ),
    );
    // full_name is a string
    TestValidator.predicate(
      `regular user full_name is non-empty string: ${user.full_name}`,
      typeof user.full_name === "string" && user.full_name.length > 0,
    );
    // email_verified is boolean
    TestValidator.predicate(
      `email_verified is boolean: ${user.email_verified}`,
      typeof user.email_verified === "boolean",
    );
  });
}
