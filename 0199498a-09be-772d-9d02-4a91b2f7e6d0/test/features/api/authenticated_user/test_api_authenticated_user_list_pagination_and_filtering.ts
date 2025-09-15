import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIStoryfieldAiAuthenticatedusers } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIStoryfieldAiAuthenticatedusers";
import type { IStoryfieldAiAuthenticatedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiAuthenticatedUser";
import type { IStoryfieldAiAuthenticatedusers } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiAuthenticatedusers";
import type { IStoryfieldAiSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiSystemAdmin";

/**
 * Test that a system admin can retrieve a paginated and filtered list of
 * registered authenticated users, filtering by fields like email and
 * registration date, and verifying correct pagination.
 *
 * Steps:
 *
 * 1. Register a new system admin
 * 2. Login as the system admin
 * 3. Register multiple authenticated users with distinct emails and
 *    external_user_ids
 * 4. Use the admin endpoint /storyfieldAi/systemAdmin/authenticatedUsers with
 *    various filter/pagination bodies
 * 5. Validate: result set matches filter (by email, actor_type, registration
 *    date), includes created_at/updated_at/deleted_at, pagination controls
 *    response size, and soft-deleted user filtering is handled (deleted users
 *    can be included/excluded as per filter)
 * 6. Edge case: Query filter that yields no results
 */
export async function test_api_authenticated_user_list_pagination_and_filtering(
  connection: api.IConnection,
) {
  // 1. Register a system admin
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const externalAdminId: string = RandomGenerator.alphaNumeric(16);
  const sysAdmin: IStoryfieldAiSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        external_admin_id: externalAdminId,
        email: adminEmail,
        actor_type: "systemAdmin",
      } satisfies IStoryfieldAiSystemAdmin.IJoin,
    });
  typia.assert(sysAdmin);

  // 2. Login as system admin
  const sysAdminLogin = await api.functional.auth.systemAdmin.login(
    connection,
    {
      body: {
        external_admin_id: externalAdminId,
        email: adminEmail,
      } satisfies IStoryfieldAiSystemAdmin.ILogin,
    },
  );
  typia.assert(sysAdminLogin);

  // 3. Register several authenticated users
  const users = await ArrayUtil.asyncMap(
    ArrayUtil.repeat(7, (idx) => idx),
    async (idx) => {
      const externalUserId = RandomGenerator.alphaNumeric(12) + idx;
      // emails are constructed to be unique and valid
      const email = `test_user_${RandomGenerator.alphaNumeric(8)}_${idx}@e2e-example.test`;
      const user = await api.functional.auth.authenticatedUser.join(
        connection,
        {
          body: {
            external_user_id: externalUserId,
            email,
            actor_type: "authenticatedUser",
          } satisfies IStoryfieldAiAuthenticatedUser.ICreate,
        },
      );
      typia.assert(user);
      return user;
    },
  );

  // 4. Query list, no filters (should see all created)
  let list =
    await api.functional.storyfieldAi.systemAdmin.authenticatedUsers.index(
      connection,
      {
        body: {} satisfies IStoryfieldAiAuthenticatedusers.IRequest,
      },
    );
  typia.assert(list);
  TestValidator.predicate(
    "should retrieve at least all created users",
    users.every((u) => list.data.some((x) => x.email === u.email)),
  );

  // 5. Filter by email (should return exactly one)
  const targetUser = users[2];
  let filtered =
    await api.functional.storyfieldAi.systemAdmin.authenticatedUsers.index(
      connection,
      {
        body: {
          email: targetUser.email,
        } satisfies IStoryfieldAiAuthenticatedusers.IRequest,
      },
    );
  typia.assert(filtered);
  TestValidator.equals(
    "email-filter returns only matching user",
    filtered.data.length,
    1,
  );
  TestValidator.equals(
    "email-filtered user's email matches",
    filtered.data[0]?.email,
    targetUser.email,
  );

  // 6. Pagination: use limit=3, then page=2
  let paged1 =
    await api.functional.storyfieldAi.systemAdmin.authenticatedUsers.index(
      connection,
      {
        body: {
          limit: 3 satisfies number as number,
          page: 1 satisfies number as number,
        } satisfies IStoryfieldAiAuthenticatedusers.IRequest,
      },
    );
  typia.assert(paged1);
  TestValidator.equals(
    "pagination 1st page limit matches",
    paged1.data.length,
    3,
  );
  let paged2 =
    await api.functional.storyfieldAi.systemAdmin.authenticatedUsers.index(
      connection,
      {
        body: {
          limit: 3 satisfies number as number,
          page: 2 satisfies number as number,
        } satisfies IStoryfieldAiAuthenticatedusers.IRequest,
      },
    );
  typia.assert(paged2);
  TestValidator.predicate(
    "pagination 2nd page doesn't contain 1st page records",
    paged2.data.every((row) =>
      paged1.data.every((first) => first.id !== row.id),
    ),
  );

  // 7. Date range filtering: pick a user, filter strictly for its created_at
  const refUser = users[4];
  let byDate =
    await api.functional.storyfieldAi.systemAdmin.authenticatedUsers.index(
      connection,
      {
        body: {
          created_from: refUser.created_at,
          created_to: refUser.created_at,
        } satisfies IStoryfieldAiAuthenticatedusers.IRequest,
      },
    );
  typia.assert(byDate);
  TestValidator.equals(
    "created_at range yields only the reference user",
    byDate.data.length,
    1,
  );
  TestValidator.equals(
    "date range user matches ref",
    byDate.data[0]?.id,
    refUser.id,
  );

  // 8. Edge: email filter for non-existent (empty result)
  let empty =
    await api.functional.storyfieldAi.systemAdmin.authenticatedUsers.index(
      connection,
      {
        body: {
          email: `doesnotexist_${RandomGenerator.alphaNumeric(10)}_${Date.now()}@example-debug.email`,
        } satisfies IStoryfieldAiAuthenticatedusers.IRequest,
      },
    );
  typia.assert(empty);
  TestValidator.equals(
    "email filter yields empty result",
    empty.data.length,
    0,
  );

  // 9. Soft delete filter, expecting none as API doesn't provide deletion in test
  let onlyDeleted =
    await api.functional.storyfieldAi.systemAdmin.authenticatedUsers.index(
      connection,
      {
        body: {
          deleted: true,
        } satisfies IStoryfieldAiAuthenticatedusers.IRequest,
      },
    );
  typia.assert(onlyDeleted);
  TestValidator.equals(
    "no soft-deleted users should be present",
    onlyDeleted.data.length,
    0,
  );
}
