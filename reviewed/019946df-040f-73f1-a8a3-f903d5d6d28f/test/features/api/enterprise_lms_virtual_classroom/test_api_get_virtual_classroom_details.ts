import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsCorporateLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCorporateLearner";
import type { IEnterpriseLmsVirtualClassroom } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsVirtualClassroom";

/**
 * Test retrieving detailed information of a virtual classroom session by ID
 * for an authenticated corporate learner.
 *
 * This test simulates a real-world flow where a learner creates an account,
 * logs in, simulates creation of a virtual classroom session, and retrieves
 * details of that session. It also validates error handling for invalid or
 * unauthorized session IDs.
 *
 * Steps:
 *
 * 1. Join corporate learner account with valid tenant ID and details.
 * 2. Login the learner to obtain authentication tokens.
 * 3. Simulate creation of a virtual classroom with the learner's tenant ID.
 * 4. Retrieve the virtual classroom details by its ID and validate.
 * 5. Verify error on retrieval with invalid UUID.
 * 6. Verify error on retrieval with valid but unauthorized tenant session ID.
 */
export async function test_api_get_virtual_classroom_details(
  connection: api.IConnection,
) {
  // 1. Create a corporate learner account
  const tenantId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const email = `${RandomGenerator.alphaNumeric(6)}@example.com`;
  const learnerCreate = {
    tenant_id: tenantId,
    email,
    password: "Password123!",
    first_name: RandomGenerator.name(2),
    last_name: RandomGenerator.name(2),
  } satisfies IEnterpriseLmsCorporateLearner.ICreate;

  const authorizedLearner: IEnterpriseLmsCorporateLearner.IAuthorized =
    await api.functional.auth.corporateLearner.join(connection, {
      body: learnerCreate,
    });
  typia.assert(authorizedLearner);

  // 2. Login with the created learner account
  const learnerLogin = {
    email: authorizedLearner.email,
    password: "Password123!",
  } satisfies IEnterpriseLmsCorporateLearner.ILogin;

  const loggedInLearner: IEnterpriseLmsCorporateLearner.IAuthorized =
    await api.functional.auth.corporateLearner.login(connection, {
      body: learnerLogin,
    });
  typia.assert(loggedInLearner);

  // 3. Simulate creation of a virtual classroom session for the learner's tenant
  const virtualClassroom: IEnterpriseLmsVirtualClassroom = {
    ...typia.random<IEnterpriseLmsVirtualClassroom>(),
    tenant_id: tenantId,
  };
  typia.assert(virtualClassroom);

  // 4. Retrieve the virtual classroom details
  const retrievedSession: IEnterpriseLmsVirtualClassroom =
    await api.functional.enterpriseLms.corporateLearner.virtualClassrooms.getVirtualClassroom(
      connection,
      {
        virtualClassroomId: virtualClassroom.id,
      },
    );
  typia.assert(retrievedSession);

  TestValidator.equals(
    "retrieved session id",
    retrievedSession.id,
    virtualClassroom.id,
  );
  TestValidator.equals(
    "retrieved session tenant id",
    retrievedSession.tenant_id,
    tenantId,
  );

  // 5. Test error on retrieval with invalid UUID
  await TestValidator.error(
    "invalid virtual classroom ID should fail",
    async () => {
      await api.functional.enterpriseLms.corporateLearner.virtualClassrooms.getVirtualClassroom(
        connection,
        {
          virtualClassroomId:
            "00000000-0000-0000-0000-000000000000" satisfies string &
              tags.Format<"uuid">,
        },
      );
    },
  );

  // 6. Test error on retrieval with valid UUID but unauthorized tenant
  const unauthorizedTenantUUID: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "unauthorized virtual classroom access should fail",
    async () => {
      await api.functional.enterpriseLms.corporateLearner.virtualClassrooms.getVirtualClassroom(
        connection,
        {
          virtualClassroomId: unauthorizedTenantUUID,
        },
      );
    },
  );
}
