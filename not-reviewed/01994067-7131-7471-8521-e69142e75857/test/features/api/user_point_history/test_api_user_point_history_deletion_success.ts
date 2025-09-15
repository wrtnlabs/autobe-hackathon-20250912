import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAdmin";
import type { IOauthServerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerMember";
import type { IOauthServerUserPoint } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerUserPoint";
import type { IOauthServerUserPointHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerUserPointHistory";

export async function test_api_user_point_history_deletion_success(
  connection: api.IConnection,
) {
  // 1. Register a new member user
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "password1234";
  const memberUser: IOauthServerMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
      } satisfies IOauthServerMember.ICreate,
    });
  typia.assert(memberUser);

  // 2. Authenticate the member user
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IOauthServerMember.ILogin,
  });

  // 3. Register a new admin user
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "adminPass123";
  const adminUser: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        email_verified: true,
        password: adminPassword,
      } satisfies IOauthServerAdmin.ICreate,
    });
  typia.assert(adminUser);

  // 4. Authenticate the admin user
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IOauthServerAdmin.ILogin,
  });

  // 5. Admin creates user point record for the member user
  const userPoint: IOauthServerUserPoint =
    await api.functional.oauthServer.admin.userPoints.create(connection, {
      body: {
        user_id: memberUser.id,
        balance: 1000,
      } satisfies IOauthServerUserPoint.ICreate,
    });
  typia.assert(userPoint);

  // 6. Switch to member user login to perform history operations
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IOauthServerMember.ILogin,
  });

  // 7. Member creates user point history entry
  const userPointHistory: IOauthServerUserPointHistory =
    await api.functional.oauthServer.member.userPoints.histories.create(
      connection,
      {
        userPointId: userPoint.id,
        body: {
          user_point_id: userPoint.id,
          change_amount: 200,
          balance_after_change: 1200,
          reason: "Initial grant",
        } satisfies IOauthServerUserPointHistory.ICreate,
      },
    );
  typia.assert(userPointHistory);

  // 8. Member deletes the user point history entry
  await api.functional.oauthServer.member.userPoints.histories.erase(
    connection,
    {
      userPointId: userPoint.id,
      id: userPointHistory.id,
    },
  );
}
