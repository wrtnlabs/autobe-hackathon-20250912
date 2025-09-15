import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAdmin";
import type { IOauthServerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerMember";
import type { IOauthServerUserPoint } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerUserPoint";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIOauthServerUserPoint } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIOauthServerUserPoint";

/**
 * This test validates the PATCH /oauthServer/admin/userPoints endpoint
 * which lists user points records with filtering and pagination under an
 * authenticated admin context.
 *
 * Business Workflow:
 *
 * 1. Create an admin user and assert authorization and tokens.
 * 2. Admin login to refresh tokens and confirm authorization.
 * 3. Create a regular user account to act as the owner of user points.
 * 4. Create a user point record linked to the created user with a specific
 *    initial balance.
 * 5. Call the user points index endpoint with filters: specific user_id,
 *    balance range (min and max), and pagination params (page and limit).
 * 6. Validate the response pagination metadata and verify that all returned
 *    records match the filters exactly.
 * 7. Test unauthorized access by calling the index endpoint without admin auth
 *    header and expect error.
 * 8. Test invalid filter values (e.g., negative page number, balance_min >
 *    balance_max) and expect errors.
 *
 * All type assertions and validations utilize typia.assert for type safety.
 * Successful business and security rules enforcement are confirmed via
 * TestValidator assertions.
 */
export async function test_api_user_point_admin_index_with_filters_and_pagination(
  connection: api.IConnection,
) {
  // 1: Create an admin user
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        email_verified: true,
        password: "validPassword123",
      } satisfies IOauthServerAdmin.ICreate,
    });
  typia.assert(admin);

  // 2: Admin login
  const loginAccessToken: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: "validPassword123",
      } satisfies IOauthServerAdmin.ILogin,
    });
  typia.assert(loginAccessToken);

  // 3: Create a user (member)
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const user: IOauthServerMember =
    await api.functional.oauthServer.oauthServerMembers.create(connection, {
      body: {
        email: userEmail,
        password: "ValidPassword!123", // Using a realistic password
      } satisfies IOauthServerMember.ICreate,
    });
  typia.assert(user);

  // 4: Create user point
  const initialBalance = 5000;
  const userPoint: IOauthServerUserPoint =
    await api.functional.oauthServer.admin.userPoints.create(connection, {
      body: {
        user_id: user.id,
        balance: initialBalance,
      } satisfies IOauthServerUserPoint.ICreate,
    });
  typia.assert(userPoint);

  // 5: Call the user points index endpoint with filters and pagination
  const filterRequest = {
    user_id: user.id,
    balance_min: 1000,
    balance_max: 10000,
    page: 1,
    limit: 10,
  } satisfies IOauthServerUserPoint.IRequest;

  const pageResult: IPageIOauthServerUserPoint =
    await api.functional.oauthServer.admin.userPoints.index(connection, {
      body: filterRequest,
    });
  typia.assert(pageResult);

  // Validation: check pagination metadata correctness
  TestValidator.predicate(
    "pagination.current equals requested page",
    pageResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination.limit equals requested limit",
    pageResult.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination.pages is greater or equal to 1",
    pageResult.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "pagination.records is greater or equal to data length",
    pageResult.pagination.records >= pageResult.data.length,
  );

  // Validation: check all user points belong to the requested user_id and within balance range
  for (const point of pageResult.data) {
    TestValidator.equals(
      `user point's user_id equals filter user_id for point id ${point.id}`,
      point.user_id,
      user.id,
    );
    TestValidator.predicate(
      `balance of point id ${point.id} is >= balance_min filter`,
      point.balance >= 1000,
    );
    TestValidator.predicate(
      `balance of point id ${point.id} is <= balance_max filter`,
      point.balance <= 10000,
    );
  }

  // 6: Test unauthorized access - create a fresh unauthenticated connection
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "unauthorized access should be rejected",
    async () => {
      await api.functional.oauthServer.admin.userPoints.index(
        unauthConnection,
        {
          body: {}, // no filters needed to cause unauthorized
        },
      );
    },
  );

  // 7: Test invalid filters
  // negative page number
  await TestValidator.error(
    "negative page number should cause error",
    async () => {
      await api.functional.oauthServer.admin.userPoints.index(connection, {
        body: {
          page: -1,
        } satisfies IOauthServerUserPoint.IRequest,
      });
    },
  );

  // balance_min greater than balance_max
  await TestValidator.error(
    "balance_min greater than balance_max should cause error",
    async () => {
      await api.functional.oauthServer.admin.userPoints.index(connection, {
        body: {
          balance_min: 10000,
          balance_max: 1000,
        } satisfies IOauthServerUserPoint.IRequest,
      });
    },
  );
}
