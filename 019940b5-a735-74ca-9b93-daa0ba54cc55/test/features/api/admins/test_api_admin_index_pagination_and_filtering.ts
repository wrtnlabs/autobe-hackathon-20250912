import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEventRegistrationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEventRegistrationAdmin";

export async function test_api_admin_index_pagination_and_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create initial admin via join to establish authorization context
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminFullName = RandomGenerator.name();
  const adminPasswordHash = RandomGenerator.alphabets(20); // hashed password simulation

  const initialAdmin: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.join.createAdminUser(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPasswordHash,
        full_name: adminFullName,
        phone_number: null,
        profile_picture_url: null,
        email_verified: true,
      } satisfies IEventRegistrationAdmin.ICreate,
    });
  typia.assert(initialAdmin);

  // Step 2: Login as the created initial admin to acquire auth token
  const loggedInAdmin: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.login.loginAdminUser(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPasswordHash,
      } satisfies IEventRegistrationAdmin.ILogin,
    });
  typia.assert(loggedInAdmin);

  // Step 3: Create multiple admin users with diverse email_verified and full_name
  const createdAdmins: IEventRegistrationAdmin[] = [];
  for (let i = 0; i < 10; ++i) {
    // Random full name with potential substring for filtering
    const fullName = i === 4 ? `Test${adminFullName}` : RandomGenerator.name();
    const emailVerified = i % 2 === 0; // true for even indices
    const phoneNumber = i % 3 === 0 ? RandomGenerator.mobile() : null;
    const profileUrl =
      i % 4 === 0
        ? `https://${RandomGenerator.name(1)}.example.com/pic.jpg`
        : null;
    const email = typia.random<string & tags.Format<"email">>();

    const adminCreateBody = {
      email: email,
      password_hash: RandomGenerator.alphabets(20),
      full_name: fullName,
      phone_number: phoneNumber,
      profile_picture_url: profileUrl,
      email_verified: emailVerified,
    } satisfies IEventRegistrationAdmin.ICreate;

    const createdAdmin =
      await api.functional.eventRegistration.admin.admins.create(connection, {
        body: adminCreateBody,
      });
    typia.assert(createdAdmin);
    createdAdmins.push(createdAdmin);
  }

  // Step 4: Request paginated list of admins filtered by email_verified: true
  // and full_name containing substring, sorted by created_at descending
  const filterFullName = createdAdmins[4].full_name; // substring to filter
  const indexRequest = {
    email_verified: true,
    full_name: filterFullName,
    page: 1,
    limit: 5,
    orderBy: "created_at",
    orderDirection: "desc",
  } satisfies IEventRegistrationAdmin.IRequest;

  const pageResult = await api.functional.eventRegistration.admin.admins.index(
    connection,
    {
      body: indexRequest,
    },
  );
  typia.assert(pageResult);

  // Step 5: Validate pagination data
  TestValidator.predicate(
    "Pagination current page is 1",
    pageResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "Pagination limit is 5",
    pageResult.pagination.limit === 5,
  );

  // Step 6: Validate all data items have email_verified true and full_name contains filterFullName
  for (const admin of pageResult.data) {
    TestValidator.predicate(
      `Admin ${admin.id} email_verified is true`,
      admin.email_verified === true,
    );
    // case sensitive substring check
    TestValidator.predicate(
      `Admin ${admin.id} full_name contains filter substring`,
      admin.full_name.includes(filterFullName),
    );
  }

  // Step 7: Validate sorting by created_at descending
  for (let i = 0; i + 1 < pageResult.data.length; ++i) {
    const createdI = new Date(pageResult.data[i].created_at).getTime();
    const createdNext = new Date(pageResult.data[i + 1].created_at).getTime();
    TestValidator.predicate(
      `Admin ${pageResult.data[i].id} created_at >= next`,
      createdI >= createdNext,
    );
  }
}
