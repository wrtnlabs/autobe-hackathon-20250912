import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IChatbotMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotMember";
import type { IChatbotPoints } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotPoints";

export async function test_api_chatbot_points_retrieval_by_member(
  connection: api.IConnection,
) {
  // 1. Register a new chatbot member
  const memberCreateBody = {
    internal_sender_id: RandomGenerator.alphaNumeric(16),
    nickname: RandomGenerator.name(),
  } satisfies IChatbotMember.ICreate;

  const member: IChatbotMember.IAuthorized =
    await api.functional.auth.member.join.joinMember(connection, {
      body: memberCreateBody,
    });
  typia.assert(member);

  // 2. Create a chatbot points record for the member
  const createPointsBody = {
    chatbot_member_id: member.id,
    points:
      RandomGenerator.alphaNumeric(4)
        .split("")
        .reduce((acc, cur) => acc + cur.charCodeAt(0), 0) % 1000, // realistic points 0~999
  } satisfies IChatbotPoints.ICreate;

  const createdPoints: IChatbotPoints =
    await api.functional.chatbot.member.chatbotPoints.create(connection, {
      body: createPointsBody,
    });
  typia.assert(createdPoints);

  // 3. Retrieve the chatbot points record by id
  const pointsDetail: IChatbotPoints =
    await api.functional.chatbot.member.chatbotPoints.at(connection, {
      id: createdPoints.id,
    });
  typia.assert(pointsDetail);

  // 4. Validate that the retrieved points detail matches created record
  TestValidator.equals(
    "points detail id matches created",
    pointsDetail.id,
    createdPoints.id,
  );
  TestValidator.equals(
    "points detail member id matches created",
    pointsDetail.chatbot_member_id,
    createdPoints.chatbot_member_id,
  );
  TestValidator.equals(
    "points detail points match created",
    pointsDetail.points,
    createdPoints.points,
  );

  // 5. Error test: Retrieve non-existent ID
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "access non existent points id should fail",
    async () => {
      await api.functional.chatbot.member.chatbotPoints.at(connection, {
        id: nonExistentId,
      });
    },
  );

  // 6. Error test: Retrieve points of other member not authorized
  // Register another member
  const anotherMemberBody = {
    internal_sender_id: RandomGenerator.alphaNumeric(16),
    nickname: RandomGenerator.name(),
  } satisfies IChatbotMember.ICreate;

  const anotherMember: IChatbotMember.IAuthorized =
    await api.functional.auth.member.join.joinMember(connection, {
      body: anotherMemberBody,
    });
  typia.assert(anotherMember);

  // Create points for the other member
  const anotherPointsBody = {
    chatbot_member_id: anotherMember.id,
    points:
      RandomGenerator.alphaNumeric(4)
        .split("")
        .reduce((acc, cur) => acc + cur.charCodeAt(0), 0) % 1000, // realistic points
  } satisfies IChatbotPoints.ICreate;

  const anotherPoints: IChatbotPoints =
    await api.functional.chatbot.member.chatbotPoints.create(connection, {
      body: anotherPointsBody,
    });
  typia.assert(anotherPoints);

  // Attempt to retrieve another member's points with the first member's connection
  await TestValidator.error(
    "access points of unauthorized member should fail",
    async () => {
      await api.functional.chatbot.member.chatbotPoints.at(connection, {
        id: anotherPoints.id,
      });
    },
  );
}
