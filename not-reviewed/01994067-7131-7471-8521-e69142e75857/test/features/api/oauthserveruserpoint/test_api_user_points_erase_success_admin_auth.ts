import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAdmin";
import type { IOauthServerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerMember";
import type { IOauthServerUserPoint } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerUserPoint";

/**
 * This scenario tests the deletion of a user point balance record by an
 * administrator. The test starts by creating and authenticating as an admin
 * user, then creating a user, creating a user point record for that user, and
 * finally deleting the user point record. The test verifies that the user point
 * record is initially created successfully and confirms its removal after the
 * delete operation. It covers business rules such as proper authorization for
 * deletion and error handling when attempting to delete a non-existent record.
 */
export async function test_api_user_points_erase_success_admin_auth(
  connection: api.IConnection,
) {
  // 1. Admin user creation and authentication
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        email_verified: true,
        password: "P@ssw0rd",
      } satisfies IOauthServerAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create a new normal user
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const user: IOauthServerMember =
    await api.functional.oauthServer.oauthServerMembers.create(connection, {
      body: {
        email: userEmail,
        password: "UserP@ss1",
      } satisfies IOauthServerMember.ICreate,
    });
  typia.assert(user);

  // 3. Create a user point record for the created user
  const createUserPointBody = {
    user_id: user.id,
    balance: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<10000>
    >() satisfies number as number,
  } satisfies IOauthServerUserPoint.ICreate;
  const userPoint: IOauthServerUserPoint =
    await api.functional.oauthServer.admin.userPoints.create(connection, {
      body: createUserPointBody,
    });
  typia.assert(userPoint);
  TestValidator.equals(
    "created user point user_id should match",
    userPoint.user_id,
    user.id,
  );

  // 4. Delete the user point record using admin authorized connection
  await api.functional.oauthServer.admin.userPoints.erase(connection, {
    id: userPoint.id,
  });

  // 5. Attempt to delete the same user point record again, expecting error
  await TestValidator.error(
    "deleting non-existent user point should fail",
    async () => {
      await api.functional.oauthServer.admin.userPoints.erase(connection, {
        id: userPoint.id,
      });
    },
  );
}
