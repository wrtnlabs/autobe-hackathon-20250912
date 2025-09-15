import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerMember";

/**
 * This E2E test validates the retrieval of detailed information about a
 * specific OAuth server member by their ID. The test covers member creation,
 * login authentication, authorized member detail retrieval, unauthorized access
 * rejection, and non-existent member ID error handling.
 */
export async function test_api_oauth_server_member_retrieve_details_successful(
  connection: api.IConnection,
) {
  // 1. Create a new member user
  const createBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IOauthServerMember.ICreate;
  const member: IOauthServerMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: createBody,
    });
  typia.assert(member);

  // 2. Login with the created user's credentials
  const loginBody = {
    email: createBody.email,
    password: createBody.password,
  } satisfies IOauthServerMember.ILogin;
  const loginResult: IOauthServerMember.IAuthorized =
    await api.functional.auth.member.login(connection, {
      body: loginBody,
    });
  typia.assert(loginResult);

  // 3. Retrieve member details with authenticated session
  const memberDetails: IOauthServerMember =
    await api.functional.oauthServer.member.oauthServerMembers.at(connection, {
      id: member.id,
    });
  typia.assert(memberDetails);

  // 4. Validate retrieved member details match created member data
  TestValidator.equals("Member ID matches", memberDetails.id, member.id);
  TestValidator.equals("Email matches", memberDetails.email, member.email);
  TestValidator.equals(
    "Email verified matches",
    memberDetails.email_verified,
    member.email_verified,
  );
  TestValidator.equals(
    "Created timestamp matches",
    memberDetails.created_at,
    member.created_at,
  );
  TestValidator.equals(
    "Updated timestamp matches",
    memberDetails.updated_at,
    member.updated_at,
  );
  TestValidator.equals(
    "Deleted timestamp matches",
    memberDetails.deleted_at ?? null,
    member.deleted_at ?? null,
  );
  TestValidator.equals(
    "Password hash matches",
    memberDetails.password_hash,
    member.password_hash,
  );

  // 5. Attempt retrieval without authentication - expect failure
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("Unauthorized access rejected", async () => {
    await api.functional.oauthServer.member.oauthServerMembers.at(unauthConn, {
      id: member.id,
    });
  });

  // 6. Attempt retrieval with non-existent member ID - expect failure
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "Non-existent member ID retrieval fails",
    async () => {
      await api.functional.oauthServer.member.oauthServerMembers.at(
        connection,
        {
          id: nonExistentId,
        },
      );
    },
  );
}
