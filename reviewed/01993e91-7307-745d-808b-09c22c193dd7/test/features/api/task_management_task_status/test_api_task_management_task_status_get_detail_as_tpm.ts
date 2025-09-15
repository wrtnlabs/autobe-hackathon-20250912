import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITaskManagementTaskStatuses } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementTaskStatuses";
import type { ITaskManagementTaskStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatus";
import type { ITaskManagementTaskStatuses } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatuses";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * E2E test for retrieving detailed task status information as an authorized
 * TPM user.
 *
 * This test performs the complete workflow:
 *
 * 1. Registers a new TPM user with realistic credentials.
 * 2. Authenticates the TPM user to obtain JWT tokens.
 * 3. Ensures at least one task status record exists via filtered retrieval.
 * 4. Randomly selects a task status summary from the retrieved list.
 * 5. Retrieves full task status detail by the selected status ID.
 * 6. Validates that detailed information matches the selected summary.
 * 7. Tests proper error handling by requesting non-existent task status ID.
 *
 * This thoroughly verifies role-based access and API contract compliance
 * for retrieving task status details in the TPM domain.
 */
export async function test_api_task_management_task_status_get_detail_as_tpm(
  connection: api.IConnection,
) {
  // 1. TPM User Registration
  const tpmUserEmail = `tpmuser_${RandomGenerator.alphaNumeric(10)}@test.com`;
  const tpmUserName = RandomGenerator.name(2);
  const tpmUserPassword = "Password123!";

  const joinBody = {
    email: tpmUserEmail,
    password: tpmUserPassword,
    name: tpmUserName,
  } satisfies ITaskManagementTpm.IJoin;

  const joinedUser: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, { body: joinBody });
  typia.assert(joinedUser);

  // 2. TPM User Login
  const loginBody = {
    email: tpmUserEmail,
    password: tpmUserPassword,
  } satisfies ITaskManagementTpm.ILogin;

  const loggedUser: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.login(connection, { body: loginBody });
  typia.assert(loggedUser);

  // 3. Setup Task Status filter to ensure data exists
  const requestBody = {
    code: null,
    name: null,
    page: 1,
    limit: 20,
    orderBy: null,
  } satisfies ITaskManagementTaskStatuses.IRequest;

  const pageResult: IPageITaskManagementTaskStatuses.ISummary =
    await api.functional.taskManagement.tpm.taskManagementTaskStatuses.index(
      connection,
      { body: requestBody },
    );
  typia.assert(pageResult);

  TestValidator.predicate(
    "At least one task status exists",
    pageResult.data.length > 0,
  );

  // 4. Pick one task status from data
  const selectedStatusSummary = RandomGenerator.pick(pageResult.data);

  // 5. Retrieve its detailed info by ID
  const detailedStatus: ITaskManagementTaskStatus =
    await api.functional.taskManagement.tpm.taskManagementTaskStatuses.at(
      connection,
      {
        id: selectedStatusSummary.id,
      },
    );
  typia.assert(detailedStatus);

  // 6. Validate detail matches selected summary
  TestValidator.equals(
    "Detail status id matches summary id",
    detailedStatus.id,
    selectedStatusSummary.id,
  );
  TestValidator.equals(
    "Detail status code matches summary code",
    detailedStatus.code,
    selectedStatusSummary.code,
  );
  TestValidator.equals(
    "Detail status name matches summary name",
    detailedStatus.name,
    selectedStatusSummary.name,
  );

  // 7. Test retrieval failure for invalid/non-existent ID
  const fakeId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "Fetching task status with non-existent id should error",
    async () => {
      await api.functional.taskManagement.tpm.taskManagementTaskStatuses.at(
        connection,
        { id: fakeId },
      );
    },
  );
}
