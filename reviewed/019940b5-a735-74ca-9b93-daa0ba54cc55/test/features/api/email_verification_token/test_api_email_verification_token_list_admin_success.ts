import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationAdmin";
import type { IEventRegistrationEmailVerificationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEmailVerificationToken";
import type { IEventRegistrationRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationRegularUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEventRegistrationEmailVerificationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEventRegistrationEmailVerificationToken";

/**
 * Tests listing email verification tokens for a regular user by an admin.
 *
 * This test covers a full real-world workflow:
 *
 * 1. Create an admin user account and authenticate as admin.
 * 2. Create a regular user account and authenticate as regular user.
 * 3. As admin, create multiple email verification tokens for the regular user.
 * 4. As admin, fetch the paginated list of email verification tokens for the
 *    regular user.
 * 5. Verify correctness of pagination, token details, and consistency against
 *    created tokens.
 * 6. Test boundary conditions such as empty token list and multiple tokens.
 * 7. Validate the accuracy of filtering and pagination responses.
 *
 * This test demonstrates multi-role authentication handling and the
 * integrity of token listing functionality, ensuring admins see complete,
 * correct data.
 *
 * It uses realistic random data where applicable and validates all API
 * responses with `typia.assert` for 100% type safety.
 */
export async function test_api_email_verification_token_list_admin_success(
  connection: api.IConnection,
) {
  // 1. Admin user creation and authentication
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphaNumeric(16);
  const admin: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.join.createAdminUser(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPassword,
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        profile_picture_url: null,
        email_verified: true,
      } satisfies IEventRegistrationAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Authenticate as the admin user
  await api.functional.auth.admin.login.loginAdminUser(connection, {
    body: {
      email: adminEmail,
      password_hash: adminPassword,
    } satisfies IEventRegistrationAdmin.ILogin,
  });

  // 3. Regular user creation and authentication
  const regularUserEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const regularUserPassword: string = RandomGenerator.alphaNumeric(16);
  const regularUser: IEventRegistrationRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join.joinRegularUser(connection, {
      body: {
        email: regularUserEmail,
        password_hash: regularUserPassword,
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        profile_picture_url: null,
        email_verified: false,
      } satisfies IEventRegistrationRegularUser.ICreate,
    });
  typia.assert(regularUser);

  // 4. Authenticate as the regular user
  await api.functional.auth.regularUser.login.loginRegularUser(connection, {
    body: {
      email: regularUserEmail,
      password_hash: regularUserPassword,
    } satisfies IEventRegistrationRegularUser.ILogin,
  });

  // 5. Switch back to admin to create email verification tokens for the regular user
  await api.functional.auth.admin.login.loginAdminUser(connection, {
    body: {
      email: adminEmail,
      password_hash: adminPassword,
    } satisfies IEventRegistrationAdmin.ILogin,
  });

  // Function to create a single email verification token with valid data
  async function createToken(): Promise<IEventRegistrationEmailVerificationToken> {
    const now: Date = new Date();
    const expiresAt: string = new Date(
      now.getTime() + 1000 * 60 * 60 * 24,
    ).toISOString(); // 1 day expiry
    const tokenString: string = RandomGenerator.alphaNumeric(32);
    const tokenCreateBody = {
      event_registration_regular_user_id: regularUser.id,
      token: tokenString,
      expires_at: expiresAt,
      created_at: now.toISOString(),
    } satisfies IEventRegistrationEmailVerificationToken.ICreate;

    const token: IEventRegistrationEmailVerificationToken =
      await api.functional.eventRegistration.admin.regularUsers.emailVerificationTokens.create(
        connection,
        {
          regularUserId: regularUser.id,
          body: tokenCreateBody,
        },
      );

    typia.assert(token);
    TestValidator.equals(
      "token user ID matches",
      token.event_registration_regular_user_id,
      regularUser.id,
    );
    TestValidator.equals("token string matches", token.token, tokenString);
    TestValidator.equals("token expiry matches", token.expires_at, expiresAt);
    return token;
  }

  // 6. Create multiple tokens for testing list
  const createdTokens: IEventRegistrationEmailVerificationToken[] = [];
  const tokenCount: number = RandomGenerator.pick([0, 1, 3, 5, 10]);
  for (let i = 0; i < tokenCount; ++i) {
    const token = await createToken();
    createdTokens.push(token);
  }

  // 7. List email verification tokens with pagination parameters
  // Test with page 1 and limit large enough to include all tokens
  const page1 =
    await api.functional.eventRegistration.admin.regularUsers.emailVerificationTokens.index(
      connection,
      {
        regularUserId: regularUser.id,
        body: {
          page: 1,
          limit: 20,
          event_registration_regular_user_id: regularUser.id,
        } satisfies IEventRegistrationEmailVerificationToken.IRequest,
      },
    );
  typia.assert(page1);

  TestValidator.equals(
    "pagination current page is 1",
    page1.pagination.current,
    1,
  );
  TestValidator.predicate(
    "total records is greater or equal to created tokens",
    page1.pagination.records >= tokenCount,
  );
  TestValidator.predicate(
    "returned data count is not more than limit",
    page1.data.length <= 20,
  );

  // 8. Validate all returned tokens belong to the user
  for (const token of page1.data) {
    TestValidator.equals(
      "token user ID matches regular user",
      token.event_registration_regular_user_id,
      regularUser.id,
    );
  }

  // 9. Validate that all created tokens are in the paginated results
  for (const createdToken of createdTokens) {
    const found = page1.data.find(
      (t) => t.id === createdToken.id && t.token === createdToken.token,
    );
    TestValidator.predicate(
      `created token ${createdToken.id} is found in list`,
      found !== undefined,
    );
  }

  // 10. Test boundary condition: request page with no tokens
  if (tokenCount > 0) {
    const emptyPage =
      await api.functional.eventRegistration.admin.regularUsers.emailVerificationTokens.index(
        connection,
        {
          regularUserId: regularUser.id,
          body: {
            page: Math.max(1000, page1.pagination.pages + 1),
            limit: 10,
            event_registration_regular_user_id: regularUser.id,
          } satisfies IEventRegistrationEmailVerificationToken.IRequest,
        },
      );
    typia.assert(emptyPage);
    TestValidator.equals("empty page has zero data", emptyPage.data.length, 0);
  }

  // 11. Test filtering by token string if at least one token exists
  if (createdTokens.length > 0) {
    const sampleToken = RandomGenerator.pick(createdTokens);
    const filteredPage =
      await api.functional.eventRegistration.admin.regularUsers.emailVerificationTokens.index(
        connection,
        {
          regularUserId: regularUser.id,
          body: {
            token: sampleToken.token,
            page: 1,
            limit: 10,
            event_registration_regular_user_id: regularUser.id,
          } satisfies IEventRegistrationEmailVerificationToken.IRequest,
        },
      );
    typia.assert(filteredPage);
    TestValidator.predicate(
      `filtered page data length is at most 1`,
      filteredPage.data.length <= 1,
    );
    if (filteredPage.data.length === 1) {
      TestValidator.equals(
        "filtered token matches sample token",
        filteredPage.data[0].token,
        sampleToken.token,
      );
    }
  }
}
