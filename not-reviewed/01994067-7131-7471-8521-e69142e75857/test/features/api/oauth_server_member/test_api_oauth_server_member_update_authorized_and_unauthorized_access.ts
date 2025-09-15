import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerMember";

export async function test_api_oauth_server_member_update_authorized_and_unauthorized_access(
  connection: api.IConnection,
) {
  // 1. Member user joins (registers) and obtains authorization token
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IOauthServerMember.ICreate;

  const memberAuthorized: IOauthServerMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: joinBody });
  typia.assert(memberAuthorized);

  // 2. Authorized member tries to update their own information
  const updateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    email_verified: !memberAuthorized.email_verified,
  } satisfies IOauthServerMember.IUpdate;

  const updatedMember: IOauthServerMember =
    await api.functional.oauthServer.member.oauthServerMembers.update(
      connection,
      {
        id: memberAuthorized.id,
        body: updateBody,
      },
    );
  typia.assert(updatedMember);

  // Assertions to verify that update response matches expected data
  TestValidator.equals(
    "member id should remain the same",
    updatedMember.id,
    memberAuthorized.id,
  );
  TestValidator.equals(
    "email should be updated",
    updatedMember.email,
    updateBody.email,
  );
  TestValidator.equals(
    "email_verified should be updated",
    updatedMember.email_verified,
    updateBody.email_verified,
  );

  // 3. Try to update a different member's information with the same member token, expect authorization error
  const fakeId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  await TestValidator.error(
    "unauthorized update attempt with different member id should fail",
    async () => {
      await api.functional.oauthServer.member.oauthServerMembers.update(
        connection,
        {
          id: fakeId,
          body: updateBody,
        },
      );
    },
  );

  // 4. Attempt an update without authentication using unauthenticated connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "update attempt without authentication should fail",
    async () => {
      await api.functional.oauthServer.member.oauthServerMembers.update(
        unauthConn,
        {
          id: memberAuthorized.id,
          body: updateBody,
        },
      );
    },
  );
}
